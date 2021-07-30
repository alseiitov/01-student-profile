(async () => {
    const SCHOOL_DOMAIN = '01.alem.school'
    const GRAPHQL_ENDPOINT = `https://${SCHOOL_DOMAIN}/api/graphql-engine/v1/graphql`

    const student = {
        id: 0,
        login: 'alseiitov',
        transactions: [],
        totalXP: 0
    }

    const parse = async (query, variables) => {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
        })

        return await response.json()
    }

    let offset = 0

    while (true) {
        const obj = await parse(`
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
    })

    document.getElementById('login').innerText = `login: ${student.login}`
    document.getElementById('total-xp').innerText = `total xp: ${student.totalXP.toLocaleString()}`

    const xpOverDateGraph = {
        width: 1000,
        height: 500,
        topOffset: 500,
        leftOffset: 100,
        labels: [],
        data: [],
    }

    const firstTransactionDate = student.transactions[0].createdAt
    const lastTransactionDate = student.transactions[student.transactions.length - 1].createdAt
    const firstAndLastDateDiff = lastTransactionDate.getTime() - firstTransactionDate.getTime()

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
                months.push(month + 1 + '/' + year)
            }
        }
        return months;
    }

    const months = getMonths(firstTransactionDate, lastTransactionDate)

    for (let i = 0; i < months.length; i++) {
        const x = (i / (months.length - 1) * xpOverDateGraph.width) + xpOverDateGraph.leftOffset
        const y = xpOverDateGraph.height + 30
        const text = months[i]
        const type = 'x-label'

        xpOverDateGraph.labels.push({ x, y, text, type })
    }

    for (let i = 0; i <= 10; i++) {
        const x = xpOverDateGraph.leftOffset * 0.7
        const y = i == 0 ? 510 : 450 - ((10 - i) * 50) + 10
        const text = (i == 0 ? 0 : Math.round(student.totalXP / i)).toLocaleString()
        const type = 'y-label'

        xpOverDateGraph.labels.push({ x, y, text, type })
    }

    for (let i = 1; i < student.transactions.length; i++) {
        const x1 = (student.transactions[i -1].createdAt.getTime() - firstTransactionDate) / firstAndLastDateDiff * 1000
        const x2 = (student.transactions[i].createdAt.getTime() - firstTransactionDate) / firstAndLastDateDiff * 1000

        const y1 = student.transactions[i - 1].totalXP / student.totalXP * 500
        const y2 = student.transactions[i].totalXP / student.totalXP * 500

        xpOverDateGraph.data.push({
            type: 'circle', cx: x2, cy: y2,
            text: `${student.transactions[i].totalXP.toLocaleString()} XP\n${student.transactions[i].createdAt.toLocaleDateString("en-GB")}`
        })

        xpOverDateGraph.data.push({ type: 'line', x1, x2, y1, y2 })
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

    drawGraph(xpOverDateGraph)
})();