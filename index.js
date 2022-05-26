import { h, render } from 'https://unpkg.com/preact@latest?module'
import htm from 'https://unpkg.com/htm?module'
import {
    useState,
    useEffect,
} from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module'

console.log('test')

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

    return html`<div class="trello__wrapper">
        <div class="trello__header">
            <input
                placeholder="Telegram login"
                class="trello__telegram-input"
                error=${loginError}
                value=${login}
                onInput=${(e) => onChangeLogin(e)}
            />
            ${Boolean(loginError) &&
            html`<span class="trello__login-error">
                ${loginError}
                </span>`}
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
            class="trello__item"
        >
            <div class="trello__item-header">
                <h3>${data.name}</h3>
                <p>${data.desc}</p>
            </div>
            <button
                class="trello__button"
                onClick=${onClick}
            >
                ${buttonText}
            </button>
        </div>
    `
}

render(html`<${App} />`, document.body)
