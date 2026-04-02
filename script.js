const board = document.getElementById("board");
const trelloOrgId = '69cd1c868a86ca3c906da76c';
const trelloKey = '8efbd4c4bbce7a6d33b89689c949b233';
const trelloToken = 'ATTA77272e81365c3f57bb6bb77356b882d9a9f451532904f647987bea5f0945c28dE2BF7FE5';

const createTrelloBoardOptions = async () => {
  const trelloURL = `https://api.trello.com/1/organizations/${trelloOrgId}/boards?key=${trelloKey}&token=${trelloToken}&fields=id,name,url`;

  const trelloResponse = await fetch(trelloURL);

  if (!trelloResponse.ok) {
    throw new Error(`Trello API error: ${trelloResponse.status}`);
  }

  const data = await trelloResponse.json();


  data.forEach(element => {
    const option = document.createElement('option');
    option.value = element.id;
    option.textContent = element.name;
    board.appendChild(option);
  });
}

const fetchN8NData = async (group) => {
  const n8nWHLink = "https://dancodeur.app.n8n.cloud/webhook/653d0586-27cc-43dd-93ac-53757e262fed";

  const n8nResponse = await fetch(n8nWHLink, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(group)
  })

  const n8nData = await n8nResponse.json();
  console.log(n8nData);
}

createTrelloBoardOptions();

const form = document.getElementById('trelloForm')

form.addEventListener('submit', async (e) => {
  let timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  e.preventDefault();
  const boardForm = new FormData(form);
  const boardFormValue = boardForm.get('trello-boards');
  const trelloListsURL = `https://api.trello.com/1/boards/${boardFormValue}/lists?key=${trelloKey}&token=${trelloToken}`;
  const trelloCardsURL = `https://api.trello.com/1/boards/${boardFormValue}/cards?key=${trelloKey}&token=${trelloToken}&fields=name,desc,idList`;


  const [listsResponse, cardsResponse] = await Promise.all([fetch(trelloListsURL), fetch(trelloCardsURL)]);

  const listsData = await listsResponse.json();
  let cardsData = await cardsResponse.json();
  cardsData = cardsData.map(card => ({
    ...card,
    createdAt: trelloIdToDate(card.id)
  }))

 timeline = document.getElementById('timeline');

cardsData.forEach(card => {
  const el = document.createElement('div');
  el.className = 'timeline-card';
  el.innerHTML = `
    <div>${card.createdAt.toLocaleString()}</div>
    <h3>${card.name}</h3>
    <p>${card.desc || ''}</p>
  `;
  timeline.appendChild(el);
});

  const grouped = listsData.map(list => ({
    id: list.id,
    name: list.name,
    tasks: cardsData.filter(card => card.idList === list.id)
  }))

  console.log(grouped)

  fetchN8NData(grouped)
})

const trelloIdToDate = (id) => {
  const seconds = parseInt(id.substring(0, 8), 16);
  return new Date(seconds * 1000);
}
