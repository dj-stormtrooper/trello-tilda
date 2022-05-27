import { h, render } from 'https://unpkg.com/preact@latest?module'
import htm from 'https://unpkg.com/htm?module'
import {
    useState,
    useEffect,
} from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module'

const html = htm.bind(h)

const TRELLO_BOARD_ID = 'psBDx0d8'
const TRELLO_API_KEY = '3636549aec431f4cd7d45322147361ea'
const TRELLO_API_TOKEN =
    'd32bfabca4972086af7b845f789a854ad6fe97e18684f17fd2b6890e21aa1bf8'
const COMMENT_TEXT = 'Взял в работу: '
const DISCLAIMER = html`
<p>Друзья! В этом разделе мы собрали заявки от беженцев, которые пока не смогли выполнить сами. Вы можете выбрать любую заявку и помочь нам с её выполнением!</p>
<p>Заявки сортированы по разделам, также мы выделили самое срочное.</p>
<p>Если у вас нет возможности купить всё из списка, ничего страшного, любая помощь будет полезна!</p>
<p>Вещи вы можете приносить нам по адресу <a href="https://goo.gl/maps/nouWtfnuBPorbfXD8" target="_blank">Палиашвили, 60</a>, либо просить у нас контакты человека, которому помощь предназначена и передавать лично.</p>
<p>! Огромная просьба перед тем, как покупать что-то из списков, связаться с волонтёрами (Соня <a href="https://t.me/sofiagerich" target="_blank">@sofiagerich</a>, Сергей <a href="https://t.me/cielo_despejado" target="_blank">@cielo_despejado</a>, Наташа <a href="https://t.me/nataly_zvereva" target="_blank">@nataly_zvereva</a>) и уточнить актуальность!</p>`

function makeRequest(urlString, options, method) {
    const url = new URL(urlString)

    url.searchParams.set('token', TRELLO_API_TOKEN)
    url.searchParams.set('key', TRELLO_API_KEY)

    for (let key in options) {
        url.searchParams.set(key, options[key])
    }

    return fetch(url.toString(), {
        method: method || 'GET',
        headers: {
            Accept: 'application/json',
            'content-type': 'text/plain',
        },
    }).then((res) => res.json())
}

function isAcceptableCard(card) {
    const hasInternalSymbol = card.name.startsWith('!');
    const hasChecklists = card.idChecklists.length > 0;

    return !hasInternalSymbol && hasChecklists;
}

function prepareLists(lists, checklists) {
    const checklistMap = checklists.reduce((acc, checklist) => ({ ...acc, [checklist.id]: checklist }), {});

    return lists
        .map((list) => {
            const cards = list.cards
                .filter((card) => isAcceptableCard(card))
                .map((card) => {
                    const nameRow = card.desc.split('\n').find((item) => item.includes('Имя:')) || '';
                    const name = nameRow.split(':')[1] || 'Анонимно';

                    const cardChecklists = card.idChecklists
                        .map((id) => checklistMap[id])
                        .reduce((acc, checklist) => [ ...acc, ...checklist.checkItems], [])
                        .filter((check) => {
                            const hasInternalSymbol = check.name.startsWith('!');
                            const isInomplete = check.state === 'incomplete';
                            
                            return !hasInternalSymbol && isInomplete;
                        });

                    return { name: name.trim(), checklists: cardChecklists, } 
                })
                .filter((card) => card.checklists.length > 0)
            
            return { ...list, cards };
        })
        .filter((list) => {
            const hasForbiddenName = list.name === 'Роженицы'
            const hasCards = list.cards && list.cards.length > 0

            return hasCards && !hasForbiddenName
        })
}

function App() {
    const [data, changeData] = useState([])
    const [cardId, changeCardId] = useState(null)

    useEffect(async () => {
        const [ checklists, lists ] = await Promise.all([
            makeRequest(`https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/checklists`),
            makeRequest(`https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists`, { card_fields: 'all', cards: 'open' })
        ])

        const preparedLists = prepareLists(lists, checklists );
            
        changeData(preparedLists)
    }, [])

    const setCardId = (cardId) => () => {
        changeCardId(cardId)
    }

    return html`<div class="trello__wrapper">
        <h2>Помощь по запросу</h2>
        <div class="trello__disclaimer">
            ${ DISCLAIMER }
        </div>
        <${Form } cardId=${cardId}/>
        ${data.map(
            (item) =>
                html`<${ListItem}
                    data=${item}
                    onCardClick=${setCardId}
                />`
        )}

    </div>`
}


function ListItem({ data, onCardClick }) {
    const [ expanded, changeExpanded ]= useState(false);
    const { cards = [] } = data;

    const toggle = () => {
        changeExpanded(!expanded);
    }

    return html`
        <div>
            <button class="trello__list-item-header" onClick=${ toggle }>
                <h3>${data.name}</h3>
            </div>
            ${ expanded && cards.map((card) => html`
                <div
                    class="trello__item"
                >
                    <div class="trello__item-header">
                        <h4 class="trello__card-name">${card.name}</h4>
                        <button
                            class="trello__button"
                            onClick=${() => onCardClick(card.id)}
                        >
                            Хочу помочь
                        </button>
                    </div>
                    ${ card.checklists.map(({ name }) => html`<p>${ name }</p>`)}
                </div>
            `)}
        </div>
    `
}

function Form({ cardId }) {
    const [login, changeLogin] = useState('')
    const [loginError, changeLoginError] = useState('')

    if (!cardId) {
        return null;
    }

    const sendApplication = () => {
        if (!login) {
            changeLoginError('Введите логин')
            return
        }

        makeRequest(
            `https://api.trello.com/1/cards/${cardId}/actions/comments`,
            { text: `${COMMENT_TEXT}${login}` },
            'POST',
        )
            .catch((err) => console.log(err))
    }

    const onChangeLogin = (e) => {
        changeLoginError('')
        changeLogin(e.target.value)
    }

    return html`
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
            <button onClick=${ sendApplication }>Отправить</button>
    </div>
    `
}

render(html`<${App} />`, document.body)
