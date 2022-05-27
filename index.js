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
const COMMENT_TEXT = 'Отклик с сайта\nКонтакты: '
const ACCEPTED_LABEL_ID = "62911f1ae64f3f79c811d356";
const DISCLAIMER = html`
<p>Друзья! В этом разделе мы собрали заявки от беженцев, которые пока не смогли выполнить сами. Вы можете выбрать любую заявку и помочь нам с её выполнением!</p>
<p>Заявки сортированы по разделам, также мы выделили самое срочное.</p>
<p>Если у вас нет возможности купить всё из списка, ничего страшного, любая помощь будет полезна!</p>
<p>Вещи вы можете приносить нам по адресу <a href="https://goo.gl/maps/nouWtfnuBPorbfXD8" target="_blank">Палиашвили, 60</a> либо просить у нас контакты человека, которому помощь предназначена, и передавать лично.</p>
<p>! Огромная просьба перед тем, как покупать что-то из списков, связаться с волонтёрами (Соня <a href="https://t.me/nomoresoft" target="_blank">@nomoresoft</a>, Сергей <a href="https://t.me/cielo_despejado" target="_blank">@cielo_despejado</a>, Наташа <a href="https://t.me/nataly_zvereva" target="_blank">@nataly_zvereva</a>) и уточнить актуальность!</p>`

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
    const hasInternalLabel = Boolean(card.labels.find(({ id }) => id === ACCEPTED_LABEL_ID));

    return !hasInternalSymbol && hasChecklists && !hasInternalLabel;
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

                    return { id: card.id, name: name.trim(), checklists: cardChecklists, } 
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

    useEffect(async () => {
        const [ checklists, lists ] = await Promise.all([
            makeRequest(`https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/checklists`),
            makeRequest(`https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists`, { card_fields: 'all', cards: 'open' })
        ])

        const preparedLists = prepareLists(lists, checklists );
            
        changeData(preparedLists)
    }, [])

    return html`<div class="trello__wrapper">
        <h2>Помощь по запросу</h2>
        <div class="trello__disclaimer">
            ${ DISCLAIMER }
        </div>
        ${data.map(
            (item) =>
                html`<${ListItem} data=${item}/>`
        )}

    </div>`
}


function ListItem({ data }) {
    const [ expanded, changeExpanded ]= useState(false);
    const { cards = [] } = data;
    const [ limit, changeLimit ] = useState(10);

    const restCount = Math.max(cards.length - limit, 0);

    const toggle = () => {
        changeExpanded(!expanded);
    }

    const increaseLimit = () => {
        changeLimit(limit + 10)
    }

    return html`
        <div class="trello__list-item">
            <button class="trello__list-item-header" onClick=${ toggle }>
                <h3>${data.name}</h3>
            </div>
            ${ expanded && cards.slice(0, limit).map((card) => html`<${ Card } card=${ card }/>`)}
            ${ expanded && Boolean(restCount) && html`<p class="trello__show-more"><button class="trello__button-link" onClick=${ increaseLimit  }>
                <b>Показать ещё ${ Math.min(restCount, 10) }</b>
            </button></p>` }
        </div>
    `
}

function Card({ card }) {
    const items = card.checklists;

    const [ isExpanded, changeExpanded ] = useState(items.length <= 5);
    const itemsToRender = isExpanded ? items : items.slice(0, 5);

    const [ isFormVisible, changeFormVisibility ] = useState(false);

    const toggleForm = () => {
        changeFormVisibility(!isFormVisible);
    }

    const expand = () => {
        changeExpanded(true);
    }

    return html`
    <div
        class="trello__item"
    >
        <div class="trello__item-header">
            <h4 class="trello__card-name">${card.name}</h4>
            <button
                class="trello__button"
                onClick=${ toggleForm }
            >
                Хочу помочь
            </button>
        </div>
        ${ itemsToRender.map(({ name }) => html`<p>${ name }</p>`)}
        ${ !isExpanded && html`<p><button onClick=${ expand } class="trello__button-link">Показать все</button></p>` }
        ${ isFormVisible && html`<${ Form } cardId=${ card.id } onSubmit=${ toggleForm }/>` }
    </div>
`
}

function Form({ cardId, onSubmit }) {
    const [login, changeLogin] = useState('')
    const [comment, changeComment] = useState('')
    const [loginError, changeLoginError] = useState('')
    const [hasSuccess, changeSuccess] = useState(false)

    const sendApplication = () => {
        if (!login) {
            changeLoginError('Введите логин')
            return
        }

        const text = `${COMMENT_TEXT}${login}${ comment ? `\nКомментарий: ${ comment }` : ''}`;
        Promise.all([
            makeRequest(`https://api.trello.com/1/cards/${cardId}/actions/comments`, { text }, 'POST'),
            makeRequest(`https://api.trello.com/1/cards/${cardId}/idLabels`, { value: ACCEPTED_LABEL_ID }, 'POST'),
        ]).then(() => changeSuccess(true))
    }

    const onChangeLogin = (value) => {
        changeLoginError('')
        changeLogin(value)
    }

    return html`
        <div class="trello__form">
            <h3>Оставьте контакты</h3>
                <input
                    placeholder="Telegram-логин или телефон"
                    class="trello__telegram-input"
                    error=${loginError}
                    value=${login}
                    onInput=${(e) => onChangeLogin(e.target.value)}
                />
                ${Boolean(loginError) &&
                    html`<span class="trello__login-error">
                        ${loginError}
                        </span>`}

                <input
                    placeholder="Комментарий (необязательно)"
                    class="trello__telegram-input"
                    value=${comment}
                    onInput=${(e) => changeComment(e.target.value)}
                />
       
                <button onClick=${ sendApplication } class="trello__submit-button">Отправить</button>
                <button onClick=${ onSubmit } class="trello__submit-button trello__close-button">Закрыть</button>

                ${ hasSuccess && html`<div class="trello__success-overlay">
                    <h2>Спасибо!</h2>
                    <button class="trello__button" onClick=${ onSubmit }>Закрыть</button>
                </div>` }
        </div>
    `
}

render(html`<${App} />`, document.body)
