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

    const container = document.createElement('div')

    const svg = document.createElement('svg')
    container.append(svg)
    svg.classList.add('graph')

    const xGrid = document.createElement('g')
    svg.append(xGrid)
    xGrid.classList.add('grid', 'x-grid')

    const xLine = document.createElement('line')
    xGrid.append(xLine)
    xLine.setAttribute('x1', 100)
    xLine.setAttribute('x2', 100)
    xLine.setAttribute('y1', 0)
    xLine.setAttribute('y2', 500)

    const yGrid = document.createElement('g')
    svg.append(yGrid)
    yGrid.classList.add('grid', 'y-grid')

    const yLine = document.createElement('line')
    yGrid.append(yLine)
    yLine.setAttribute('x1', 100)
    yLine.setAttribute('x2', 1100)
    yLine.setAttribute('y1', 500)
    yLine.setAttribute('y2', 500)

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

    const xLabels = document.createElement('g')
    svg.append(xLabels)
    xLabels.classList.add('labels', 'x-labels')

    for (let i = 0; i < months.length; i++) {
        const label = document.createElement('text')
        xLabels.append(label)
        label.classList.add('date-label')

        const x = (i / (months.length - 1) * 1000) + 100
        const y = 530

        label.setAttribute('x', x)
        label.setAttribute('y', y)

        label.innerText = months[i]
    }

    const yLabels = document.createElement('g')
    svg.append(yLabels)
    yLabels.classList.add('labels', 'y-labels')

    for (let i = 0; i <= 10; i++) {
        const label = document.createElement('text')
        yLabels.prepend(label)

        const x = 70
        const y = i == 0 ? 510 : 450 - ((10 - i) * 50) + 10

        label.setAttribute('x', x)
        label.setAttribute('y', y)

        const xp = i == 0 ? 0 : Math.round(student.totalXP / i)
        label.innerText = xp.toLocaleString()
    }

    const data = document.createElement('g')
    svg.append(data)
    data.classList.add('data')

    for (let i = 0; i < student.transactions.length - 1; i++) {
        const x1 = (student.transactions[i].createdAt.getTime() - firstTransactionDate) / firstAndLastDateDiff * 1000
        const x2 = (student.transactions[i + 1].createdAt.getTime() - firstTransactionDate) / firstAndLastDateDiff * 1000

        const y1 = student.transactions[i].totalXP / student.totalXP * 500
        const y2 = student.transactions[i + 1].totalXP / student.totalXP * 500

        const circle = document.createElement('circle')
        data.append(circle)
        circle.setAttribute('cx', x2 + 100)
        circle.setAttribute('cy', 500 - y2)
        circle.setAttribute('r', 4)
        circle.innerHTML = `
        <title>
            ${student.transactions[i].totalXP.toLocaleString()} XP
            ${student.transactions[i].createdAt.toLocaleDateString()}
        </title>
        `

        const line = document.createElement('line')
        data.append(line)
        line.setAttribute('x1', x1 + 100)
        line.setAttribute('x2', x2 + 100)
        line.setAttribute('y1', 500 - y1)
        line.setAttribute('y2', 500 - y2)
    }

    document.body.innerHTML += container.innerHTML
})();