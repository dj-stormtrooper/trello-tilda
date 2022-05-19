import { h, render } from 'https://unpkg.com/preact@latest?module'
import htm from 'https://unpkg.com/htm?module'
import {
    useState,
    useEffect,
} from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module'

const html = htm.bind(h)

const TRELLO_BOARD_ID = '2NQZ5FT4'
const TRELLO_API_KEY = '3636549aec431f4cd7d45322147361ea'
const TRELLO_API_TOKEN =
    'd32bfabca4972086af7b845f789a854ad6fe97e18684f17fd2b6890e21aa1bf8'
const COMMENT_TEXT = 'Взял в работу: '

function App() {
    const [data, changeData] = useState([])
    const [login, changeLogin] = useState('')
    const [loginError, changeLoginError] = useState('')
    const [checked, changeChecked] = useState({})

    useEffect(() => {
        const url = new URL(
            `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/cards/open`
        )

        url.searchParams.set('token', TRELLO_API_TOKEN)
        url.searchParams.set('key', TRELLO_API_KEY)

        fetch(url)
            .then((res) => res.json())
            .then((res) => {
                // console.log(res)
                changeData(res)
            })
    }, [])

    const onChangeLogin = (e) => {
        changeLoginError('')
        changeLogin(e.target.value)
    }

    const sendApplication = (cardId) => () => {
        if (!login) {
            changeLoginError('Введите логин')
            return
        }
        const url = new URL(
            `https://api.trello.com/1/cards/${cardId}/actions/comments`
        )

        url.searchParams.set('text', `${COMMENT_TEXT}${login}`)
        url.searchParams.set('token', TRELLO_API_TOKEN)
        url.searchParams.set('key', TRELLO_API_KEY)

        fetch(url.toString(), {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'content-type': 'text/plain',
            },
        })
            .then((res) => res.json())
            .then((res) => {
                console.log(res)
                changeChecked({ ...checked, [cardId]: true })
            })
            .catch((err) => console.log(err))
    }

    return html`<div style="padding: 16px; font-family: Arial; width: 800px;">
        <div style="display: flex;">
            <input
                placeholder="Telegram login"
                style="margin-bottom: 10px"
                error=${loginError}
                value=${login}
                onInput=${(e) => onChangeLogin(e)}
            />
            ${Boolean(loginError) &&
            html`<span style="color: red; margin-left: 16px;"
                >${loginError}</span
            >`}
        </div>
        ${data.map(
            (item) =>
                html`<${Item}
                    data=${item}
                    checked=${checked[item.id]}
                    onClick=${sendApplication(item.id)}
                />`
        )}
    </div>`
}

function Item({ data, checked, onClick }) {
    const buttonText = checked ? 'Спасибо!' : 'Хочу помочь'

    return html`
        <div
            style="display: flex; justify-content: space-between; flex: 1; border: 1px solid grey; padding: 8px 16px; margin-bottom: 8px;"
        >
            <div style="margin-right: 24px;">
                <h3>${data.name}</h3>
                <p>${data.desc}</p>
            </div>
            <button
                style="height: 60px; min-width: 100px; display: block; flex: 0;"
                onClick=${onClick}
            >
                ${buttonText}
            </button>
        </div>
    `
}

render(html`<${App} />`, document.body)
