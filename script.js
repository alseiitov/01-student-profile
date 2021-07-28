(async () => {
    const SCHOOL_DOMAIN = '01.alem.school'
    const GRAPHQL_ENDPOINT = `https://${SCHOOL_DOMAIN}/api/graphql-engine/v1/graphql`

    const student = {
        id: 0,
        login: 'alseiitov',
        transactions: [],
        progresses: [],
        results: [],
        totalXP: 0
    }

    const parse = async (query, variables) => {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query, variables: variables }),
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
    document.getElementById('total-xp').innerText = `total xp: ${student.totalXP}`

    const container = document.createElement('div')

    const svg = document.createElement('svg')
    svg.classList.add('graph')
    container.append(svg)

    const xGrid = document.createElement('g')
    xGrid.classList.add('grid', 'x-grid')
    svg.append(xGrid)

    const xLine = document.createElement('line')
    xLine.setAttribute('x1', 100)
    xLine.setAttribute('x2', 100)
    xLine.setAttribute('y1', 0)
    xLine.setAttribute('y2', 500)
    xGrid.append(xLine)

    const yGrid = document.createElement('g')
    yGrid.classList.add('grid', 'y-grid')
    svg.append(yGrid)

    const yLine = document.createElement('line')
    yLine.setAttribute('x1', 100)
    yLine.setAttribute('x2', 1000)
    yLine.setAttribute('y1', 500)
    yLine.setAttribute('y2', 500)
    yGrid.append(yLine)

    const months = student.transactions.map(transaction =>
        (transaction.createdAt.getMonth() + 1) + '/' + transaction.createdAt.getFullYear()
    ).filter((value, index, self) =>
        self.indexOf(value) === index
    )

    const xLabels = document.createElement('g')
    xLabels.classList.add('labels', 'x-labels')
    svg.append(xLabels)

    for (let i = 0; i < months.length; i++) {
        const lable = document.createElement('text')

        const x = (i * 1000 / months.length) + 100
        const y = 530

        lable.setAttribute('x', x)
        lable.setAttribute('y', y)

        lable.innerText = months[i]

        xLabels.prepend(lable)
    }

    const yLabels = document.createElement('g')
    yLabels.classList.add('labels', 'y-labels')
    svg.append(yLabels)

    for (let i = 0; i <= 10; i++) {
        const lable = document.createElement('text')

        const x = 70
        const y = i == 0 ? 510 : 450 - ((10 - i) * 50) + 10

        lable.setAttribute('x', x)
        lable.setAttribute('y', y)

        const xp = i == 0 ? 0 : Math.round(student.totalXP / i)
        lable.innerText = xp.toLocaleString()

        yLabels.prepend(lable)
    }

    const data = document.createElement('g')
    data.classList.add('data')

    student.transactions.forEach(transaction => {
        // TODO: add data 
    })

    document.body.innerHTML += container.innerHTML
})();