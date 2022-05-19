import { h, render } from 'https://unpkg.com/preact@latest?module'
import htm from 'https://unpkg.com/htm?module'
import {
    useState,
    useEffect,
} from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module'

const html = htm.bind(h)

const TRELLO_BOARD_ID = 'ovCkv6gD'
const COMMENT_TEXT = 'Взял в работу: '

function App() {
    const [data, changeData] = useState([])
    const [login, changeLogin] = useState('');
    const [checked, changeChecked] = useState({});

    useEffect(() => {
        fetch(`https://api.trello.com/1/boards/${ TRELLO_BOARD_ID }/cards/open`)
            .then((res) => res.json())
            .then((res) => {
                // console.log(res)
                changeData(res)
            })
    }, [])
  
    const onChangeLogin = (e) => {
      changeLogin(e.target.value)
    }
    
    const sendApplication = (cardId) => () => {
      const url = new URL(`https://api.trello.com/1/cards/${cardId}/actions/comments`);
      
      url.searchParams.set('text', `${ COMMENT_TEXT }${ login }`)
      
      fetch(url.toString(), { method: 'POST' })
        .then((res) => {
          console.log(checked)
          changeChecked({ ...checked, [cardId]: true })
        })
    }

    return html`<div style="padding: 16px; font-family: Arial; width: 800px;">
      <input placeholder="Telegram login" style="margin-bottom: 10px" value=${ login } onInput=${ (e) => onChangeLogin(e) }/>
    ${ 
      data.map((item) => html`<${Item} data=${item} checked=${checked[item.id]} onClick=${ sendApplication(item.id) }/>`)
    }</div>`
}

function Item({ data, checked, onClick }) {
  const buttonText = checked ? "Спасибо!" : "Хочу помочь";
  
  return html`
  <div style="display: flex; justify-content: space-between; flex: 1; border: 1px solid grey; padding: 8px 16px; margin-bottom: 8px;">
    <div style="margin-right: 24px;">
      <h3>${ data.name }</h3>
      <p>${ data.desc }</p>
    </div>
    <button style="height: 60px; min-width: 100px; display: block; flex: 0;" onClick=${ onClick }>${ buttonText }</button>
    </div>
  `
}

render(html`<${App} />`, document.body)
