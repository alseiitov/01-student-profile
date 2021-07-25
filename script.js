(async () => {
    const SCHOOL_DOMAIN = '01.alem.school'
    const GRAPHQL_ENDPOINT = `https://${SCHOOL_DOMAIN}/api/graphql-engine/v1/graphql`

    const student = {
        id: 0,
        login: 'alseiitov',
        transactions: [],
        progresses: [],
        results: [],
        xp: 0
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
        const obj = await parse(
            `query user($login: String, $offset: Int) {
                user(where: {login: {_eq: $login}}) {
                    id
                    login
                    transactions(where: {type: {_eq: "xp"}, object: {type: {_eq: "project"}}}, offset: $offset) {
                    object {
                        id
                        name
                    }
                    type
                    amount
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

    student.transactions.forEach(transaction => {
        student.xp += transaction.amount
    })

    document.getElementById('login').innerText = `login: ${student.login}`
    document.getElementById('total-xp').innerText = `total xp: ${student.xp}`
})();