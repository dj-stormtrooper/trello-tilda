import { h, render } from 'https://unpkg.com/preact@latest?module'
import htm from 'https://unpkg.com/htm?module'
import {
    useState,
    useEffect,
    useRef,
} from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module'

const html = htm.bind(h)

const TRELLO_BOARD_ID = '0YsY6PiB'
const TRELLO_API_KEY = '16d4f7a4a889340fdcba49ef23b09a40'
const TRELLO_API_TOKEN =
    '039eb7df60f08dbf963ef5a951dec85b139cd89e23e2ade071227085bee2d6fb'
const ACCEPTED_LABEL_ID = "6292386c1978512a2fed7db8";

const COMMENT_TEXT = 'Отклик с сайта\nКонтакты: '

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
    const [ isCardVisible, changeCardVisibility ] = useState(true);

    if (!isCardVisible) {
        return null;
    }

    const onClose = (submited) => {
        changeFormVisibility(false);

        if (submited) {
            changeCardVisibility(false)
        }
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
                onClick=${ () => changeFormVisibility(true) }
            >
                Хочу помочь
            </button>
        </div>
        ${ itemsToRender.map(({ name }) => html`<p>${ name }</p>`)}
        ${ !isExpanded && html`<p><button onClick=${ expand } class="trello__button-link">Показать все</button></p>` }
        ${ isFormVisible && html`<${ Form } cardId=${ card.id } onClose=${ onClose }/>` }
    </div>
`
}

function Form({ cardId, onClose }) {
    const [login, changeLogin] = useState('')
    const [comment, changeComment] = useState('')
    const [loginError, changeLoginError] = useState('')
    const [hasSuccess, changeSuccess] = useState(false)
    const ref = useRef(null);

    const sendApplication = () => {
        if (!login) {
            changeLoginError('Введите контакты')
            return
        }

        const text = `${COMMENT_TEXT}${login}${ comment ? `\nКомментарий: ${ comment }` : ''}`;
        makeRequest(`https://api.trello.com/1/cards/${cardId}/actions/comments`, { text }, 'POST')
            .then(() => makeRequest(`https://api.trello.com/1/cards/${cardId}/idLabels`, { value: ACCEPTED_LABEL_ID }, 'POST'))
            .then(() => changeSuccess(true))
    }

    const onChangeLogin = (value) => {
        changeLoginError('')
        changeLogin(value)
    }

    useEffect(() => {
        function handleClickOutside(event) {
          if (ref.current && !ref.current.contains(event.target)) {
            onClose()
          }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }, [ref]);

    return html`
        <div class="trello__form" ref=${ ref }>
            <h3>Оставьте контакты</h3>
                <input
                    placeholder="Telegram-логин или телефон"
                    class="trello__telegram-input"
                    error=${loginError}
                    value=${login}
                    onInput=${(e) => onChangeLogin(e.target.value)}
                    maxlength="50"
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
                    maxlength="500"
                />
       
                <button onClick=${ sendApplication } class="trello__submit-button">Отправить</button>
                <button onClick=${ onClose } class="trello__submit-button trello__close-button">Закрыть</button>

                ${ hasSuccess && html`<div class="trello__success-overlay">
                    <h2>Спасибо!</h2>
                    <button class="trello__button" onClick=${ () => onClose(true) }>Закрыть</button>
                </div>` }
        </div>
    `
}

render(html`<${App} />`, document.getElementById('trello-app'))
