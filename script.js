const SCHOOL_DOMAIN = '01.alem.school'
const GRAPHQL_ENDPOINT = `https://${SCHOOL_DOMAIN}/api/graphql-engine/v1/graphql`

const student = {
    id: 0,
    login: 'alseiitov',
    transactions: [],
    totalXP: 0,
    level: 0
}

const levelChanges = [];

const fetchGraphQL = async (query, variables) => {
    const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    })

    return await response.json()
}

const parseData = async () => {
    let offset = 0

    while (true) {
        const obj = await fetchGraphQL(`
            query user($login: String, $offset: Int) {
                user(where: {login: {_eq: $login}}) {
                  id
                  login
                  transactions(
                    where: {type: {_eq: "xp"}, object: {type: {_eq: "project"}}}
                    offset: $offset
                  ) {
                    object {
                      id
                      name
                    }
                    type
                    amount
                    createdAt
                  }
                }
              }          
            `,
            {
                login: student.login,
                offset: offset
            }
        )

        offset += 50

        student.id = obj.data.user[0].id

        const transactions = obj.data.user[0].transactions
        student.transactions.push(...transactions)

        if (transactions.length < 50) {
            offset = 0
            break
        }
    }

    student.transactions.sort((a, b) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? 1 : -1
    )

    student.transactions.forEach(transaction => {
        transaction.createdAt = new Date(transaction.createdAt)

        student.totalXP += transaction.amount
        transaction.totalXP = student.totalXP

        const level = getLevelFromXp(transaction.totalXP)
        if (level > student.level) {
            levelChanges.push({ level, date: transaction.createdAt })
            student.level = level
        }
    })
}

// total xp needed for this level
const totalXPForLevel = (level) => Math.round((level * 0.66 + 1) * ((level + 2) * 150 + 50))

// cumul of all the xp needed to reach this level
const cumulXpForLevel = (level) => level > 0 ? totalXPForLevel(level) + cumulXpForLevel(level - 1) : 0

// level reached for this xp
const getLevelFromXp = (xp, level = 0) => cumulXpForLevel(level) >= xp ? level : getLevelFromXp(xp, level + 1)

// get the first day of the month of a given date
const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

// get the first day of the next month of a given date
const getFirstDayOfNextMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);

// get all months between given dates in MM/YY format
const getMonths = (fromDate, toDate) => {
    const fromYear = fromDate.getFullYear();
    const fromMonth = fromDate.getMonth();
    const toYear = toDate.getFullYear();
    const toMonth = toDate.getMonth();
    const months = [];
    for (let year = fromYear; year <= toYear; year++) {
        let month = year === fromYear ? fromMonth : 0;
        const monthLimit = year === toYear ? toMonth : 11;
        for (; month <= monthLimit; month++) {
            months.push(
                (month.toString().length == 1 ? '0' + (month + 1) : (month + 1))
                + '/' +
                year.toString().substr(-2)
            )
        }
    }
    return months;
}

// prepare graphs before drawing
const fillGraphs = (xpOverDateGraph, levelOverDateGraph) => {
    const firstDate = getFirstDayOfMonth(student.transactions[0].createdAt)
    const lastDate = getFirstDayOfNextMonth(student.transactions[student.transactions.length - 1].createdAt)
    const firstAndLastDateDiff = lastDate.getTime() - firstDate.getTime()

    const months = getMonths(firstDate, lastDate)

    // labels for dates
    for (let i = 0; i < months.length; i++) {
        const x = (i / (months.length - 1) * xpOverDateGraph.width) + xpOverDateGraph.leftOffset
        const y = xpOverDateGraph.height + 30
        const text = months[i]
        const type = 'x-label'

        xpOverDateGraph.labels.push({ x, y, text, type })
        levelOverDateGraph.labels.push({ x, y, text, type })
    }

    // labels for xp of "xp over date" graph
    for (let i = 0; i <= 10; i++) {
        const x = xpOverDateGraph.leftOffset * 0.8
        const y = (i == 0 ? 0 : xpOverDateGraph.height * (i / 10)) + 5
        const text = (i == 10 ? 0 : Math.round(student.totalXP * (1 - (i / 10)))).toLocaleString()
        const type = 'y-label'

        xpOverDateGraph.labels.push({ x, y, text, type })
    }

    // labels for levels of "level over date" graph
    for (let i = 0; i <= student.level; i++) {
        const x = levelOverDateGraph.leftOffset * 0.8
        const y = (i == 0 ? levelOverDateGraph.height : (levelOverDateGraph.height * (1 - (i / student.level)))) + 5
        const text = i
        const type = 'y-label'

        levelOverDateGraph.labels.push({ x, y, text, type })
    }

    // data for "xp over date" graph
    for (let i = 1; i < student.transactions.length; i++) {
        const curr = student.transactions[i]
        const prev = student.transactions[i - 1]

        const x1 = (prev.createdAt.getTime() - firstDate) / firstAndLastDateDiff * xpOverDateGraph.width
        const x2 = (curr.createdAt.getTime() - firstDate) / firstAndLastDateDiff * xpOverDateGraph.width

        const y1 = prev.totalXP / student.totalXP * xpOverDateGraph.height
        const y2 = curr.totalXP / student.totalXP * xpOverDateGraph.height

        xpOverDateGraph.data.push({
            type: 'circle', cx: x2, cy: y2,
            text: `${curr.totalXP.toLocaleString()} XP\n${curr.createdAt.toLocaleDateString("en-GB")}`
        })

        if (i > 1) {
            xpOverDateGraph.data.push({ type: 'line', x1, x2, y1, y2 })
        }
    }

    // data for "level over date" graph
    for (let i = 0; i < levelChanges.length - 1; i++) {
        const curr = levelChanges[i]
        const next = levelChanges[i + 1]

        const x1 = (curr.date.getTime() - firstDate) / firstAndLastDateDiff * levelOverDateGraph.width
        const x2 = (next.date.getTime() - firstDate) / firstAndLastDateDiff * levelOverDateGraph.width

        const y1 = (curr.level) / (student.level) * levelOverDateGraph.height
        const y2 = (next.level) / (student.level) * levelOverDateGraph.height

        if (i == 0) {
            levelOverDateGraph.data.push({
                type: 'circle', cx: x1, cy: y1,
                text: `0 → ${curr.level} level\n${curr.date.toLocaleDateString("en-GB")}`
            })
        }

        levelOverDateGraph.data.push({
            type: 'circle', cx: x2, cy: y2,
            text: `${curr.level} → ${next.level} level\n${next.date.toLocaleDateString("en-GB")}`
        })

        levelOverDateGraph.data.push({ type: 'line', x1, x2, y1, y2 })
    }
}

const drawGraph = (graph) => {
    const container = document.createElement('div')

    const svg = document.createElement('svg')
    container.append(svg)
    svg.classList.add('graph')

    const xGrid = document.createElement('g')
    svg.append(xGrid)
    xGrid.classList.add('grid', 'x-grid')

    const yGrid = document.createElement('g')
    svg.append(yGrid)
    yGrid.classList.add('grid', 'y-grid')

    const xLine = document.createElement('line')
    xGrid.append(xLine)
    xLine.setAttribute('x1', graph.leftOffset)
    xLine.setAttribute('x2', graph.leftOffset)
    xLine.setAttribute('y1', 0)
    xLine.setAttribute('y2', graph.topOffset)

    const yLine = document.createElement('line')
    yGrid.append(yLine)
    yLine.setAttribute('x1', graph.leftOffset)
    yLine.setAttribute('x2', graph.width + graph.leftOffset)
    yLine.setAttribute('y1', graph.topOffset)
    yLine.setAttribute('y2', graph.topOffset)

    const xLabels = document.createElement('g')
    svg.append(xLabels)
    xLabels.classList.add('labels', 'x-labels')

    const yLabels = document.createElement('g')
    svg.append(yLabels)
    yLabels.classList.add('labels', 'y-labels')

    for (let i = 0; i < graph.labels.length; i++) {
        const label = document.createElement('text')

        label.setAttribute('x', graph.labels[i].x)
        label.setAttribute('y', graph.labels[i].y)
        label.innerText = graph.labels[i].text

        if (graph.labels[i].type == 'x-label') {
            xLabels.append(label)
        }
        if (graph.labels[i].type == 'y-label') {
            yLabels.append(label)
        }
    }

    const data = document.createElement('g')
    svg.append(data)
    data.classList.add('data')

    for (let i = 0; i < graph.data.length; i++) {
        const el = document.createElement(graph.data[i].type)
        data.append(el)

        if (graph.data[i].type == 'circle') {
            el.setAttribute('cx', graph.data[i].cx + graph.leftOffset)
            el.setAttribute('cy', graph.topOffset - graph.data[i].cy)
            el.setAttribute('r', 4)
            el.innerHTML = `<title>${graph.data[i].text}</title>`
        }

        if (graph.data[i].type == 'line') {
            el.setAttribute('x1', graph.data[i].x1 + graph.leftOffset)
            el.setAttribute('x2', graph.data[i].x2 + graph.leftOffset)
            el.setAttribute('y1', graph.topOffset - graph.data[i].y1)
            el.setAttribute('y2', graph.topOffset - graph.data[i].y2)
        }
    }

    document.body.innerHTML += container.innerHTML
}

const init = async () => {
    await parseData()

    document.getElementById('login').innerText = `login: ${student.login}`
    document.getElementById('total-xp').innerText = `total xp: ${student.totalXP.toLocaleString()}`
    document.getElementById('level').innerText = `level: ${student.level}`

    const xpOverDateGraph = {
        width: 1000,
        height: 500,
        topOffset: 500,
        leftOffset: 100,
        labels: [],
        data: [],
    }

    const levelOverDateGraph = {
        width: 1000,
        height: 500,
        topOffset: 500,
        leftOffset: 100,
        labels: [],
        data: [],
    }

    fillGraphs(xpOverDateGraph, levelOverDateGraph)

    drawGraph(xpOverDateGraph)
    drawGraph(levelOverDateGraph)
}

init()
