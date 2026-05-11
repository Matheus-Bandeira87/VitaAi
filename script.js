const API_KEY = "...";

const messagesBox = document.getElementById("messages");
const questionInput = document.getElementById("question");
const askButton = document.getElementById("askButton");
const chatList = document.getElementById("chatList");
const chatTitle = document.getElementById("chatTitle");

let chats =
JSON.parse(localStorage.getItem("vita_chats")) || [];

let activeChatId =
localStorage.getItem("vita_active_chat");

function saveChats() {

    localStorage.setItem(
        "vita_chats",
        JSON.stringify(chats)
    );

    localStorage.setItem(
        "vita_active_chat",
        activeChatId || ""
    );
}

function getActiveChat() {

    return chats.find(
        chat => chat.id === activeChatId
    );
}

function createChat() {

    const chat = {
        id: Date.now().toString(),
        title: "Nova conversa",
        messages: []
    };

    chats.unshift(chat);

    activeChatId = chat.id;

    saveChats();

    renderAll();
}

function newChat() {

    createChat();
}

function clearAllChats() {

    if (!confirm("Deseja apagar tudo?")) {
        return;
    }

    chats = [];

    activeChatId = null;

    localStorage.removeItem("vita_chats");
    localStorage.removeItem("vita_active_chat");

    createChat();
}

function selectChat(id) {

    activeChatId = id;

    saveChats();

    renderAll();

    const sidebar =
    document.getElementById("sidebar");

    if (
        window.innerWidth <= 900
        &&
        sidebar
    ) {
        sidebar.classList.remove("open");
    }
}

function renderChatList() {

    chatList.innerHTML = "";

    chats.forEach(chat => {

        const div =
        document.createElement("div");

        div.className = "chat-item";

        if(chat.id === activeChatId){
            div.classList.add("active");
        }

        div.innerText = chat.title;

        div.onclick = () =>
        selectChat(chat.id);

        chatList.appendChild(div);
    });
}

function addMessageToScreen(role, text) {

    const div = document.createElement("div");

    div.classList.add("message", role);

    const label = role === "user" ? "Você" : "VitaAI";

    div.innerHTML = `
        <div class="message-label">${label}</div>
        <div class="message-content">${text.replace(/\n/g, "<br>")}</div>
    `;

    messagesBox.appendChild(div);

    messagesBox.scrollTop = messagesBox.scrollHeight;
}


function renderMessages() {

    const chat =
    getActiveChat();

    messagesBox.innerHTML = "";

    if(!chat){
        return;
    }

    chatTitle.innerText =
    chat.title;

    if(chat.messages.length === 0){

        addMessageToScreen(
            "ai",
            "Olá. Eu sou a VitaAI."
        );

        return;
    }

    chat.messages.forEach(msg => {

        addMessageToScreen(
            msg.role,
            msg.text
        );
    });
}

function renderAll() {

    renderChatList();

    renderMessages();
}

function addMessage(role, text) {

    const chat =
    getActiveChat();

    if(!chat){
        return;
    }

    chat.messages.push({
        role,
        text
    });

    if(
        chat.title === "Nova conversa"
        &&
        role === "user"
    ){

        let title =
        text.trim();

        if(title.length > 40){
            title =
            title.slice(0,40) + "...";
        }

        chat.title = title;
    }

    saveChats();

    addMessageToScreen(
        role,
        text
    );

    renderChatList();
}

function addTyping() {

    removeTyping();

    const div =
    document.createElement("div");

    div.classList.add(
        "message",
        "ai",
        "typing"
    );

    div.id = "typing";

    div.innerHTML =
    "VitaAI está pensando...";

    messagesBox.appendChild(div);

    messagesBox.scrollTop =
    messagesBox.scrollHeight;
}

function removeTyping() {

    const typing =
    document.getElementById("typing");

    if(typing){
        typing.remove();
    }
}

function buildContext(chat, question) {

    const recent =
    chat.messages
    .slice(-6)
    .map(msg => {

        const role =
        msg.role === "user"
        ? "Usuário"
        : "VitaAI";

        return `${role}: ${msg.text}`;
    })
    .join("\n");

    return `
Você é a VitaAI.

Responda em português do Brasil.

Seja:
- clara
- útil
- profissional
- direta

Não corte frases.

Histórico:
${recent}

Pergunta:
${question}
`;
}

async function askAI() {

    const question =
    questionInput.value.trim();

    if(!question){
        return;
    }

    const chat =
    getActiveChat();

    addMessage(
        "user",
        question
    );

    questionInput.value = "";

    askButton.disabled = true;

    askButton.innerText =
    "Aguarde";

    addTyping();

    try {

        const prompt =
        buildContext(
            chat,
            question
        );
const response = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        prompt: prompt
    })
});
;


        const data =
        await response.json();

        removeTyping();

        if(!response.ok){

            console.log(data);

            addMessage(
                "ai",
                "Erro da API: " +
                (
                    data.error?.message
                    ||
                    "erro desconhecido"
                )
            );

            return;
        }

        const text =
        data.candidates?.[0]
        ?.content?.parts?.[0]?.text;

        if(!text){

            addMessage(
                "ai",
                "Não consegui responder agora."
            );

            return;
        }

        addMessage(
            "ai",
            text
        );

    }
    catch(error){

        removeTyping();

        console.error(error);

        addMessage(
            "ai",
            "Erro ao conectar com a IA."
        );
    }
    finally{

        askButton.disabled = false;

        askButton.innerText =
        "Enviar";

        saveChats();
    }
}

questionInput.addEventListener(
    "keydown",
    function(event){

        if(
            event.key === "Enter"
            &&
            !event.shiftKey
        ){

            event.preventDefault();

            askAI();
        }
    }
);

function toggleSidebar(){

    const sidebar =
    document.getElementById("sidebar");

    if(sidebar){
        sidebar.classList.toggle("open");
    }
}

if(chats.length === 0){

    createChat();

}
else{

    if(
        !activeChatId
        ||
        !getActiveChat()
    ){
        activeChatId = chats[0].id;
    }

    renderAll();
}