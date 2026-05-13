const API_KEY = "AIzaSyBoFnNYck9nxTNbYzX2OWe2N8NB0JFbiwA";

const MAX_CHATS_PER_DAY = 10;
const MAX_MESSAGES_PER_CHAT = 35;
const MAX_MESSAGES_PER_DAY = 20;

let updates = [];
let APP_VERSION = "0.0.0";

const messagesBox = document.getElementById("messages");
const questionInput = document.getElementById("question");
const askButton = document.getElementById("askButton");
const chatList = document.getElementById("chatList");
const chatTitle = document.getElementById("chatTitle");

const chatView = document.getElementById("chatView");
const foodView = document.getElementById("foodView");
const fitView = document.getElementById("fitView");
const gymView = document.getElementById("gymView");
const progressView = document.getElementById("progressView");
const aboutView = document.getElementById("aboutView");
const updatesView = document.getElementById("updatesView");
const quickActions = document.getElementById("quickActions");

const chatModeBtn = document.getElementById("chatModeBtn");
const foodModeBtn = document.getElementById("foodModeBtn");
const fitModeBtn = document.getElementById("fitModeBtn");
const gymModeBtn = document.getElementById("gymModeBtn");
const progressModeBtn = document.getElementById("progressModeBtn");
const aboutModeBtn = document.getElementById("aboutModeBtn");
const updatesModeBtn = document.getElementById("updatesModeBtn");

const messagesLeft = document.getElementById("messagesLeft");
const updatesList = document.getElementById("updatesList");
const updateModal = document.getElementById("updateModal");
const updateModalTitle = document.getElementById("updateModalTitle");
const updateModalText = document.getElementById("updateModalText");

let selectedFoodImage = null;
let isSending = false;
let isFoodSending = false;
let isModeSending = false;

let chats = JSON.parse(localStorage.getItem("vita_chats")) || [];
let activeChatId = localStorage.getItem("vita_active_chat");

let dailyData = JSON.parse(localStorage.getItem("vita_daily_data")) || {
    date: new Date().toDateString(),
    createdChats: 0,
    sentMessages: 0
};

const DEFAULT_MISSIONS = [
    {
        id: "focus",
        title: "Foco do dia",
        desc: "Faça pelo menos uma tarefa importante sem enrolar."
    },
    {
        id: "movement",
        title: "Movimento",
        desc: "Treine, caminhe ou faça algum movimento leve."
    },
    {
        id: "food",
        title: "Alimentação consciente",
        desc: "Faça pelo menos uma refeição decente e sem exagero."
    },
    {
        id: "organization",
        title: "Organização rápida",
        desc: "Organize uma pequena coisa do seu dia."
    },
    {
        id: "reflection",
        title: "Fechamento do dia",
        desc: "Pense em algo que você fez bem hoje."
    }
];

let progressData = JSON.parse(localStorage.getItem("vita_progress")) || {
    level: 1,
    xp: 0,
    streak: 0,
    completedDays: 0,
    rewards: 0,
    lastCompletedDate: null,
    todayDate: new Date().toDateString(),
    rewardType: "balanced",
    missions: DEFAULT_MISSIONS.map(mission => ({
        ...mission,
        done: false
    }))
};

async function loadUpdates() {
    try {
        const response = await fetch("updates.json?cache=" + Date.now());

        if (!response.ok) {
            throw new Error("Não foi possível carregar updates.json");
        }

        const data = await response.json();

        updates = Array.isArray(data) ? data : [];

        if (updates.length > 0) {
            APP_VERSION = updates[0].version;
        }

    } catch (error) {
        console.error("Erro ao carregar atualizações:", error);

        updates = [
            {
                version: "1.0.0",
                title: "VitaAI",
                date: "Versão local",
                description: "Não foi possível carregar as atualizações agora.",
                items: [
                    "Verifique se o arquivo updates.json existe",
                    "Confira se ele está na pasta principal do projeto"
                ]
            }
        ];

        APP_VERSION = "1.0.0";
    }
}

function today() {
    return new Date().toDateString();
}

function checkDailyReset() {
    if (dailyData.date !== today()) {
        dailyData = {
            date: today(),
            createdChats: 0,
            sentMessages: 0
        };

        saveDailyData();
    }
}

function saveDailyData() {
    localStorage.setItem("vita_daily_data", JSON.stringify(dailyData));
}

function saveChats() {
    localStorage.setItem("vita_chats", JSON.stringify(chats));
    localStorage.setItem("vita_active_chat", activeChatId || "");
}

function saveProgress() {
    localStorage.setItem("vita_progress", JSON.stringify(progressData));
}

function resetProgressDayIfNeeded() {
    if (progressData.todayDate !== today()) {
        progressData.todayDate = today();

        progressData.missions = DEFAULT_MISSIONS.map(mission => ({
            ...mission,
            done: false
        }));

        saveProgress();
    }
}

function updateMessagesLeft() {
    checkDailyReset();

    if (!messagesLeft) return;

    const left = Math.max(0, MAX_MESSAGES_PER_DAY - dailyData.sentMessages);
    messagesLeft.innerText = left;
}

function canUseAI() {
    checkDailyReset();

    if (dailyData.sentMessages >= MAX_MESSAGES_PER_DAY) {
        showLimitModal(
            "Limite diário atingido",
            "Você atingiu o limite diário da VitaAI. Tente novamente amanhã."
        );

        return false;
    }

    dailyData.sentMessages++;
    saveDailyData();
    updateMessagesLeft();

    return true;
}

function showLimitModal(title, text) {
    let modal = document.getElementById("limitModal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "limitModal";
        modal.className = "limit-modal";

        modal.innerHTML = `
            <div class="limit-box">
                <h2 id="limitTitle"></h2>
                <p id="limitText"></p>
                <button type="button" onclick="closeLimitModal()">Entendi</button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    document.getElementById("limitTitle").innerText = title;
    document.getElementById("limitText").innerText = text;

    modal.classList.remove("hidden");
}

function closeLimitModal() {
    const modal = document.getElementById("limitModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}

function escapeHTML(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatText(text) {
    let safe = escapeHTML(text);

    safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/\n/g, "<br>");

    return safe;
}

function getActiveChat() {
    return chats.find(chat => chat.id === activeChatId);
}

function hasEmptyChat() {
    return chats.some(chat => chat.messages.length === 0);
}

function createChat() {
    checkDailyReset();

    if (dailyData.createdChats >= MAX_CHATS_PER_DAY) {
        showLimitModal(
            "Limite de conversas atingido",
            "Você atingiu o limite de 10 conversas por dia. Tente novamente amanhã."
        );
        return;
    }

    if (hasEmptyChat()) {
        const emptyChat = chats.find(chat => chat.messages.length === 0);

        activeChatId = emptyChat.id;

        saveChats();
        renderAll();
        showChatMode();

        return;
    }

    const chat = {
        id: Date.now().toString(),
        title: "Nova conversa",
        createdAt: new Date().toISOString(),
        messages: []
    };

    chats.unshift(chat);
    activeChatId = chat.id;

    dailyData.createdChats++;

    saveDailyData();
    saveChats();
    renderAll();
    showChatMode();
}

function newChat() {
    createChat();
    closeSidebarMobile();
}

function clearAllChats() {
    if (!confirm("Deseja apagar todos os históricos?")) return;

    chats = [];
    activeChatId = null;

    localStorage.removeItem("vita_chats");
    localStorage.removeItem("vita_active_chat");

    createChat();
}

function deleteChat(id) {
    const chat = chats.find(item => item.id === id);

    if (!chat) return;

    if (!confirm(`Apagar "${chat.title}"?`)) return;

    chats = chats.filter(item => item.id !== id);

    if (activeChatId === id) {
        activeChatId = chats[0]?.id || null;
    }

    if (chats.length === 0) {
        activeChatId = null;
        saveChats();
        createChat();
        return;
    }

    saveChats();
    renderAll();
}

function selectChat(id) {
    activeChatId = id;

    saveChats();
    renderAll();
    showChatMode();
    closeSidebarMobile();
}

function generateTitleFromText(text) {
    let clean = text
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (clean.length > 42) {
        clean = clean.slice(0, 42) + "...";
    }

    return clean || "Nova conversa";
}

function updateChatTitle(chat, text) {
    if (!chat) return;

    if (chat.title === "Nova conversa") {
        chat.title = generateTitleFromText(text);
        saveChats();
    }
}

function renderChatList() {
    if (!chatList) return;

    chatList.innerHTML = "";

    chats.forEach(chat => {
        const row = document.createElement("div");
        row.className = "chat-item-row";

        const div = document.createElement("div");
        div.className = "chat-item";

        if (chat.id === activeChatId) {
            div.classList.add("active");
        }

        div.innerText = chat.title;
        div.onclick = () => selectChat(chat.id);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-chat-btn";
        deleteBtn.innerText = "×";

        deleteBtn.onclick = event => {
            event.stopPropagation();
            deleteChat(chat.id);
        };

        row.appendChild(div);
        row.appendChild(deleteBtn);

        chatList.appendChild(row);
    });
}

function renderMessages() {
    const chat = getActiveChat();

    if (!messagesBox) return;

    messagesBox.innerHTML = "";

    if (!chat) return;

    if (chatTitle) {
        chatTitle.innerText = chat.title;
    }

    if (chat.messages.length === 0) {
        addMessageToScreen(
            "ai",
            "Olá. Eu sou a **VitaAI**.\n\nPosso te ajudar a organizar ideias, montar rotinas, melhorar foco, planejar estudos, criar hábitos e pensar em treinos de forma simples."
        );
        return;
    }

    chat.messages.forEach(msg => {
        addMessageToScreen(msg.role, msg.text);
    });

    messagesBox.scrollTop = messagesBox.scrollHeight;
}

function renderAll() {
    renderChatList();
    renderMessages();
    updateMessagesLeft();
}

function addMessageToScreen(role, text) {
    if (!messagesBox) return;

    const div = document.createElement("div");

    div.classList.add("message", role);

    const label = role === "user" ? "Você" : "VitaAI";

    div.innerHTML = `
        <div class="message-label">${label}</div>

        <div class="message-content">
            ${formatText(text)}
        </div>
    `;

    if (role === "ai" && !text.includes("Pensando")) {
        const actions = document.createElement("div");
        actions.className = "message-actions";

        const copyBtn = document.createElement("button");
        copyBtn.className = "copy-btn";
        copyBtn.innerText = "Copiar";
        copyBtn.onclick = () => copyText(text);

        actions.appendChild(copyBtn);
        div.appendChild(actions);
    }

    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

function addMessage(role, text) {
    const chat = getActiveChat();

    if (!chat) return;

    chat.messages.push({
        role,
        text,
        time: new Date().toISOString()
    });

    if (chat.messages.length > MAX_MESSAGES_PER_CHAT) {
        chat.messages = chat.messages.slice(-MAX_MESSAGES_PER_CHAT);
    }

    addMessageToScreen(role, text);

    saveChats();
    renderChatList();
}

function addTyping() {
    removeTyping();

    if (!messagesBox) return;

    const div = document.createElement("div");

    div.classList.add("message", "ai", "typing");
    div.id = "typing";

    div.innerHTML = `
        <div class="message-label">VitaAI</div>
        <div class="message-content">Pensando...</div>
    `;

    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

function removeTyping() {
    const typing = document.getElementById("typing");

    if (typing) {
        typing.remove();
    }
}

function buildContext(chat, question) {
    const recentMessages = chat.messages.slice(-8).map(msg => {
        const role = msg.role === "user" ? "Usuário" : "VitaAI";
        return `${role}: ${msg.text}`;
    }).join("\n");

    return `
Você é a VitaAI, uma assistente profissional de rotina, hábitos, estudos, produtividade, bem-estar geral, alimentação visual e organização de treino.

Use o histórico para manter contexto, mas responda principalmente a pergunta atual.

Histórico recente:
${recentMessages}

Regras obrigatórias:
- Responda em português do Brasil.
- Seja clara, útil e profissional.
- Nunca pare a resposta no meio.
- Termine todas as frases.
- Se a resposta for longa, organize em tópicos.
- Finalize com uma conclusão curta.
- Responda exatamente o que foi perguntado.
- Não dê diagnóstico médico.
- Não recomende remédios.
- Não prometa resultados garantidos.
- Se o assunto parecer grave, recomende procurar um profissional.
- Se falar de treino, explique que é orientação geral e não substitui professor ou profissional de saúde.
- Se falar de alimentação, explique que é orientação geral e não substitui nutricionista.

Formato ideal:
1. Resposta direta.
2. Explicação clara.
3. Passos práticos.
4. Exemplo, se fizer sentido.
5. Próximo passo simples.

Pergunta atual:
${question}
`;
}

async function askAI() {
    if (isSending) return;

    const question = questionInput.value.trim();

    if (!question) return;

    const chat = getActiveChat();

    if (!chat) {
        createChat();
        return;
    }

    if (!canUseAI()) return;

    updateChatTitle(chat, question);
    addMessage("user", question);

    questionInput.value = "";
    autoResizeTextarea();

    isSending = true;

    askButton.disabled = true;
    askButton.innerText = "…";

    addTyping();

    try {
        const prompt = buildContext(chat, question);

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.6,
                        maxOutputTokens: 2200
                    }
                })
            }
        );

        const data = await response.json();

        removeTyping();

        if (!response.ok) {
            handleApiError(data);
            return;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            addMessage("ai", "Não consegui responder agora.");
            return;
        }

        addMessage("ai", text);

    } catch (error) {
        removeTyping();

        showLimitModal(
            "Erro de conexão",
            "Não consegui conectar com a IA. Verifique sua internet e tente novamente."
        );

        console.error(error);

    } finally {
        isSending = false;

        askButton.disabled = false;
        askButton.innerText = "➜";

        const currentChat = getActiveChat();

        if (currentChat && chatTitle) {
            chatTitle.innerText = currentChat.title;
        }

        saveChats();
        renderChatList();
        updateMessagesLeft();
    }
}

function handleApiError(data) {
    const errorMessage =
        data.error?.message ||
        "erro desconhecido";

    if (
        errorMessage.toLowerCase().includes("quota") ||
        errorMessage.toLowerCase().includes("exceeded") ||
        errorMessage.toLowerCase().includes("rate")
    ) {
        showLimitModal(
            "Uso temporariamente limitado",
            "A VitaAI atingiu o limite temporário da API. Espere alguns minutos e tente novamente."
        );
    } else {
        showLimitModal(
            "Erro na VitaAI",
            "A VitaAI está temporariamente indisponível. Tente novamente em alguns minutos."
        );
    }
}

function hideAllModes() {
    if (chatView) chatView.classList.add("hidden");
    if (foodView) foodView.classList.add("hidden");
    if (fitView) fitView.classList.add("hidden");
    if (gymView) gymView.classList.add("hidden");
    if (progressView) progressView.classList.add("hidden");
    if (aboutView) aboutView.classList.add("hidden");
    if (updatesView) updatesView.classList.add("hidden");

    if (quickActions) quickActions.classList.add("hidden");

    if (chatModeBtn) chatModeBtn.classList.remove("active");
    if (foodModeBtn) foodModeBtn.classList.remove("active");
    if (fitModeBtn) fitModeBtn.classList.remove("active");
    if (gymModeBtn) gymModeBtn.classList.remove("active");
    if (progressModeBtn) progressModeBtn.classList.remove("active");
    if (aboutModeBtn) aboutModeBtn.classList.remove("active");
    if (updatesModeBtn) updatesModeBtn.classList.remove("active");
}

function closeSidebarMobile() {
    const sidebar = document.getElementById("sidebar");

    if (window.innerWidth <= 900 && sidebar) {
        sidebar.classList.remove("open");
    }
}

function showChatMode() {
    hideAllModes();

    if (chatView) chatView.classList.remove("hidden");
    if (quickActions) quickActions.classList.remove("hidden");
    if (chatModeBtn) chatModeBtn.classList.add("active");

    closeSidebarMobile();
}

function showFoodMode() {
    hideAllModes();

    if (foodView) foodView.classList.remove("hidden");
    if (foodModeBtn) foodModeBtn.classList.add("active");

    closeSidebarMobile();
}

function showFitMode() {
    hideAllModes();

    if (fitView) fitView.classList.remove("hidden");
    if (fitModeBtn) fitModeBtn.classList.add("active");

    closeSidebarMobile();
}

function showGymMode() {
    hideAllModes();

    if (gymView) gymView.classList.remove("hidden");
    if (gymModeBtn) gymModeBtn.classList.add("active");

    closeSidebarMobile();
}

function showProgressMode() {
    hideAllModes();

    resetProgressDayIfNeeded();
    renderProgress();

    if (progressView) progressView.classList.remove("hidden");
    if (progressModeBtn) progressModeBtn.classList.add("active");

    closeSidebarMobile();
}

function showAboutMode() {
    hideAllModes();

    if (aboutView) aboutView.classList.remove("hidden");
    if (aboutModeBtn) aboutModeBtn.classList.add("active");

    closeSidebarMobile();
}

function showUpdatesMode() {
    hideAllModes();

    if (updatesView) updatesView.classList.remove("hidden");
    if (updatesModeBtn) updatesModeBtn.classList.add("active");

    renderUpdates();
    closeSidebarMobile();
}

function previewFoodImage(event) {
    const file = event.target.files[0];

    if (!file) return;

    selectedFoodImage = file;

    const preview = document.getElementById("foodPreview");
    const placeholder = document.getElementById("uploadPlaceholder");

    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
    placeholder.classList.add("hidden");

    document.getElementById("foodResult").innerHTML =
        "Imagem carregada. Escreva uma pergunta, se quiser, e clique em <strong>Analisar com VitaAI</strong>.";
}

function resetFoodScan() {
    selectedFoodImage = null;

    const input = document.getElementById("foodImage");
    const preview = document.getElementById("foodPreview");
    const placeholder = document.getElementById("uploadPlaceholder");
    const result = document.getElementById("foodResult");
    const question = document.getElementById("foodQuestion");

    if (input) input.value = "";

    if (preview) {
        preview.src = "";
        preview.classList.add("hidden");
    }

    if (placeholder) {
        placeholder.classList.remove("hidden");
    }

    if (question) {
        question.value = "";
    }

    if (result) {
        result.innerHTML = "O resultado da análise aparecerá aqui.";
    }
}

function setFoodQuestion(text) {
    const foodQuestion = document.getElementById("foodQuestion");

    if (!foodQuestion) return;

    foodQuestion.value = text;
    foodQuestion.focus();
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const base64 = reader.result.split(",")[1];
            resolve(base64);
        };

        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}

function formatFoodResult(text) {
    const sections = text.split(/\n(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\n:]+:)/g);

    if (sections.length <= 1) {
        return formatText(text);
    }

    return sections.map(section => {
        const parts = section.split(":");
        const title = parts.shift().trim();
        const content = parts.join(":").trim();

        return `
            <div class="food-result-section">
                <h3>${formatText(title)}</h3>
                <p>${formatText(content)}</p>
            </div>
        `;
    }).join("");
}

async function analyzeFood() {
    if (isFoodSending) return;

    const resultBox = document.getElementById("foodResult");
    const foodQuestionInput = document.getElementById("foodQuestion");

    const userQuestion = foodQuestionInput.value.trim();

    if (!selectedFoodImage) {
        resultBox.innerHTML = "Envie uma imagem primeiro.";
        return;
    }

    if (!canUseAI()) return;

    isFoodSending = true;

    resultBox.innerHTML = "Analisando imagem com a VitaAI...";

    try {
        const base64Image = await fileToBase64(selectedFoodImage);

        const prompt = `
Você é a VitaAI no modo Food Scan.

Pergunta ou instrução do usuário:
${userQuestion || "O usuário não escreveu uma pergunta específica. Faça uma análise geral da imagem."}

Regras obrigatórias:
- Responda em português do Brasil.
- Seja direto, bonito e organizado.
- Responda a pergunta do usuário, se ele tiver escrito algo.
- Se ele perguntar proteína, foque em proteína.
- Se ele perguntar calorias, foque em calorias.
- Não aja como médico ou nutricionista.
- Não dê diagnóstico.
- Não prometa resultados.
- Não invente precisão exata.
- Deixe claro que os valores são estimativas visuais.
- Se algum alimento não estiver claro, diga "não identificado".

Formato obrigatório:

Resumo:
Explique rapidamente o que aparece na imagem.

Alimentos identificados:
- alimento 1
- alimento 2
- alimento 3

Estimativa aproximada:
- Proteínas: X g
- Carboidratos: X g
- Gorduras: X g
- Calorias: X kcal

Resposta à pergunta do usuário:
Responda especificamente o que ele perguntou.

Observação:
Valores aproximados com base na imagem. Para precisão real, pese os alimentos ou consulte um profissional.
`;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                },
                                {
                                    inline_data: {
                                        mime_type: selectedFoodImage.type,
                                        data: base64Image
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.35,
                        maxOutputTokens: 1800
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            handleApiError(data);
            resultBox.innerHTML = "Não consegui analisar agora.";
            return;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        resultBox.innerHTML = formatFoodResult(
            text || "Não consegui identificar os alimentos com clareza."
        );

    } catch (error) {
        console.error(error);
        resultBox.innerHTML = "Erro ao analisar imagem. Tente novamente.";
    } finally {
        isFoodSending = false;
        updateMessagesLeft();
    }
}

async function generateFitPlan() {
    const resultBox = document.getElementById("fitResult");

    const goal = document.getElementById("fitGoal").value;
    const level = document.getElementById("fitLevel").value;
    const days = document.getElementById("fitDays").value;
    const place = document.getElementById("fitPlace").value;
    const notes = document.getElementById("fitNotes").value.trim();

    await generateModeAnswer(
        resultBox,
        `
Você é a VitaAI no Fit Mode.

Monte um treino seguro e organizado.

Dados:
- Objetivo: ${goal}
- Nível: ${level}
- Dias por semana: ${days}
- Local: ${place}
- Observações: ${notes || "Nenhuma"}

Regras:
- Português do Brasil.
- Não substitui professor, médico ou fisioterapeuta.
- Não prometa resultados.
- Se houver dor ou lesão, oriente procurar profissional.
- Monte divisão semanal.
- Dê exercícios, séries, repetições e descanso.
- Explique de forma organizada.
- Seja direto, bonito e útil.

Formato:
Resumo:
Divisão semanal:
Treinos:
Observações:
Próximo passo:
`
    );
}

async function generateGymLab() {
    const resultBox = document.getElementById("gymResult");

    const focus = document.getElementById("gymFocus").value;
    const split = document.getElementById("gymSplit").value;
    const time = document.getElementById("gymTime").value;
    const priority = document.getElementById("gymPriority").value;
    const notes = document.getElementById("gymNotes").value.trim();

    await generateModeAnswer(
        resultBox,
        `
Você é a VitaAI no Gym Lab.

Crie um planejamento de musculação focado em divisão, volume semanal e foco muscular.

Dados:
- Foco principal: ${focus}
- Divisão desejada: ${split}
- Tempo por treino: ${time}
- Prioridade: ${priority}
- Detalhes do treino atual: ${notes || "Nenhum detalhe informado"}

Regras:
- Português do Brasil.
- Seja profissional e organizado.
- Não substitui professor ou profissional de saúde.
- Sugira volume semanal de forma geral.
- Explique quais músculos treinar em cada dia.
- Dê dicas de evolução sem prometer resultados.
- Se houver dor, lesão ou limitação, oriente procurar profissional.

Formato:
Diagnóstico geral:
Divisão recomendada:
Volume semanal sugerido:
Pontos de atenção:
Próximo ajuste:
`
    );
}

async function generateModeAnswer(resultBox, prompt) {
    if (isModeSending) return;

    if (!canUseAI()) return;

    isModeSending = true;

    resultBox.innerHTML = "A VitaAI está preparando uma resposta...";

    try {
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.55,
                        maxOutputTokens: 2200
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            handleApiError(data);
            resultBox.innerHTML = "Não consegui gerar agora. Tente novamente em alguns minutos.";
            return;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        resultBox.innerHTML = formatFoodResult(
            text || "Não consegui gerar uma resposta."
        );

    } catch (error) {
        console.error(error);
        resultBox.innerHTML = "Erro ao conectar com a IA.";
    } finally {
        isModeSending = false;
        updateMessagesLeft();
    }
}

/* VITA PROGRESS */

function getRewardByType(type) {
    const rewards = {
        balanced: [
            "Uma pausa longa sem culpa",
            "Uma refeição livre planejada",
            "Uma sessão de filme ou série",
            "Uma hora de jogo ou lazer",
            "Um descanso extra no dia"
        ],
        food: [
            "Uma refeição livre planejada",
            "Uma sobremesa pequena sem culpa",
            "Um lanche especial dentro do equilíbrio",
            "Escolher uma refeição favorita da semana"
        ],
        rest: [
            "Uma noite mais tranquila sem cobrança",
            "Um descanso extra planejado",
            "Uma pausa longa longe das tarefas",
            "Um dia com ritmo mais leve"
        ],
        fun: [
            "Uma hora de jogo sem culpa",
            "Assistir um filme ou série",
            "Fazer algo divertido só por prazer",
            "Separar tempo para um hobby"
        ],
        custom: [
            "Escolha uma recompensa saudável que faça sentido para você",
            "Defina uma recompensa pessoal equilibrada",
            "Escolha algo que te motive sem prejudicar seu progresso"
        ]
    };

    const list = rewards[type] || rewards.balanced;
    return list[Math.floor(Math.random() * list.length)];
}

function renderProgress() {
    resetProgressDayIfNeeded();

    const progressLevel = document.getElementById("progressLevel");
    const levelBadgeNumber = document.getElementById("levelBadgeNumber");
    const xpText = document.getElementById("xpText");
    const xpFill = document.getElementById("xpFill");
    const streakText = document.getElementById("streakText");
    const completedDaysText = document.getElementById("completedDaysText");
    const rewardsText = document.getElementById("rewardsText");
    const missionsList = document.getElementById("missionsList");
    const rewardBox = document.getElementById("rewardBox");
    const rewardType = document.getElementById("rewardType");
    const todayStatus = document.getElementById("todayStatus");

    if (progressLevel) progressLevel.innerText = progressData.level;
    if (levelBadgeNumber) levelBadgeNumber.innerText = progressData.level;

    if (xpText) xpText.innerText = `${progressData.xp}/100 XP`;
    if (xpFill) xpFill.style.width = `${progressData.xp}%`;

    if (streakText) streakText.innerText = `${progressData.streak} dias`;
    if (completedDaysText) completedDaysText.innerText = progressData.completedDays;
    if (rewardsText) rewardsText.innerText = progressData.rewards;

    if (rewardType) rewardType.value = progressData.rewardType || "balanced";

    const alreadyCompletedToday = progressData.lastCompletedDate === today();

    if (todayStatus) {
        todayStatus.innerText = alreadyCompletedToday ? "Concluído" : "Hoje";
    }

    if (missionsList) {
        missionsList.innerHTML = "";

        progressData.missions.forEach(mission => {
            const item = document.createElement("div");

            item.className = "mission-item";

            if (mission.done) {
                item.classList.add("done");
            }

            item.onclick = () => toggleProgressMission(mission.id);

            item.innerHTML = `
                <div class="mission-check">${mission.done ? "✓" : ""}</div>

                <div class="mission-text">
                    <span class="mission-title">${mission.title}</span>
                    <span class="mission-desc">${mission.desc}</span>
                </div>
            `;

            missionsList.appendChild(item);
        });
    }

    if (rewardBox) {
        if (alreadyCompletedToday) {
            rewardBox.classList.add("unlocked");
            rewardBox.innerHTML = `
                <strong>Dia concluído.</strong><br>
                Você já recebeu seu XP de hoje. Volte amanhã para continuar a sequência.
            `;
        } else {
            rewardBox.classList.remove("unlocked");
            rewardBox.innerHTML = "Complete todas as missões do dia para ganhar XP.";
        }
    }
}

function toggleProgressMission(id) {
    resetProgressDayIfNeeded();

    progressData.missions = progressData.missions.map(mission => {
        if (mission.id === id) {
            return {
                ...mission,
                done: !mission.done
            };
        }

        return mission;
    });

    saveProgress();
    renderProgress();
}

function finishProgressDay() {
    resetProgressDayIfNeeded();

    if (progressData.lastCompletedDate === today()) {
        showLimitModal(
            "Dia já concluído",
            "Você já recebeu XP hoje. Volte amanhã para continuar sua sequência."
        );

        return;
    }

    const allDone = progressData.missions.every(mission => mission.done);

    if (!allDone) {
        showLimitModal(
            "Missões incompletas",
            "Complete todas as missões de hoje antes de concluir o dia."
        );

        return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    if (progressData.lastCompletedDate === yesterdayString) {
        progressData.streak++;
    } else {
        progressData.streak = 1;
    }

    progressData.completedDays++;
    progressData.lastCompletedDate = today();

    let rewardMessage = "";
    progressData.xp += 25;

    if (progressData.xp >= 100) {
        progressData.xp = progressData.xp - 100;
        progressData.level++;
        progressData.rewards++;

        const reward = getRewardByType(progressData.rewardType);

        rewardMessage = `
Você subiu para o nível ${progressData.level}.

Recompensa desbloqueada:
${reward}
        `;
    } else {
        rewardMessage = `
Você ganhou +25 XP.

Continue completando seus dias para desbloquear uma recompensa.
        `;
    }

    saveProgress();
    renderProgress();

    showLimitModal(
        "Progresso registrado",
        rewardMessage
    );
}

function resetTodayMissions() {
    if (!confirm("Reiniciar as missões de hoje?")) return;

    progressData.todayDate = today();

    progressData.missions = DEFAULT_MISSIONS.map(mission => ({
        ...mission,
        done: false
    }));

    if (progressData.lastCompletedDate === today()) {
        progressData.lastCompletedDate = null;
    }

    saveProgress();
    renderProgress();
}

function saveRewardPreference() {
    const rewardType = document.getElementById("rewardType");

    if (!rewardType) return;

    progressData.rewardType = rewardType.value;

    saveProgress();
    renderProgress();
}

/* UPDATES */

function renderUpdates() {
    if (!updatesList) return;

    updatesList.innerHTML = "";

    updates.forEach(update => {
        const card = document.createElement("div");
        card.className = "update-card";

        card.innerHTML = `
            <div class="update-card-header">
                <h3>${update.title}</h3>
                <span class="update-version">v${update.version}</span>
            </div>

            <div class="update-date">${update.date}</div>

            <p>${update.description}</p>

            <ul class="update-list">
                ${update.items.map(item => `<li>${item}</li>`).join("")}
            </ul>
        `;

        updatesList.appendChild(card);
    });
}

function showUpdateModalIfNeeded() {
    if (!updateModal) return;
    if (!updates || updates.length === 0) return;

    const lastSeen = localStorage.getItem("vita_last_seen_version");

    if (lastSeen === APP_VERSION) return;

    const latest = updates[0];

    if (updateModalTitle) {
        updateModalTitle.innerText = latest.title;
    }

    if (updateModalText) {
        updateModalText.innerText = latest.description;
    }

    updateModal.classList.remove("hidden");
}

function closeUpdateModal() {
    localStorage.setItem("vita_last_seen_version", APP_VERSION);

    if (updateModal) {
        updateModal.classList.add("hidden");
    }
}

function openUpdatesFromModal() {
    closeUpdateModal();
    enterApp();
    showUpdatesMode();
}

/* UI HELPERS */

function useSuggestion(text) {
    showChatMode();
    questionInput.value = text;
    questionInput.focus();
    autoResizeTextarea();
}

function copyText(text) {
    navigator.clipboard.writeText(text);
}

function autoResizeTextarea() {
    if (!questionInput) return;

    questionInput.style.height = "58px";
    questionInput.style.height = Math.min(questionInput.scrollHeight, 160) + "px";
}

if (questionInput) {
    questionInput.addEventListener("input", autoResizeTextarea);

    questionInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            askAI();
        }
    });
}

if (askButton) {
    askButton.addEventListener("click", function() {
        askAI();
    });

    askButton.addEventListener("touchend", function(event) {
        event.preventDefault();
        askAI();
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");

    if (sidebar) {
        sidebar.classList.toggle("open");
    }
}

function enterApp() {
    const splash = document.getElementById("splashScreen");
    const landing = document.getElementById("landingPage");
    const app = document.getElementById("app");

    sessionStorage.setItem("vita_started", "true");

    if (splash) splash.classList.add("hidden");
    if (landing) landing.classList.add("hidden");
    if (app) app.classList.remove("hidden");

    document.body.classList.add("app-open");
    document.body.classList.remove("landing-open");
}

function scrollLandingInfo() {
    const landing = document.getElementById("landingPage");
    const info = document.getElementById("landingInfo");

    if (!landing || !info) return;

    landing.scrollTo({
        top: info.offsetTop - 40,
        behavior: "smooth"
    });
}

function showLandingAfterSplash() {
    const splash = document.getElementById("splashScreen");
    const landing = document.getElementById("landingPage");
    const app = document.getElementById("app");

    if (splash) splash.classList.add("hidden");

    if (sessionStorage.getItem("vita_started") === "true") {
        if (landing) landing.classList.add("hidden");
        if (app) app.classList.remove("hidden");

        document.body.classList.add("app-open");
        document.body.classList.remove("landing-open");
    } else {
        if (app) app.classList.add("hidden");
        if (landing) landing.classList.remove("hidden");

        document.body.classList.add("landing-open");
        document.body.classList.remove("app-open");
    }
}

async function startApp() {
    try {
        await loadUpdates();
    } catch (error) {
        console.error("Falha ao carregar updates:", error);
    }

    checkDailyReset();
    resetProgressDayIfNeeded();
    updateMessagesLeft();

    if (chats.length === 0) {
        const chat = {
            id: Date.now().toString(),
            title: "Nova conversa",
            createdAt: new Date().toISOString(),
            messages: []
        };

        chats.unshift(chat);
        activeChatId = chat.id;
        saveChats();
    } else {
        if (!activeChatId || !getActiveChat()) {
            activeChatId = chats[0].id;
        }
    }

    renderAll();
    renderUpdates();
    renderProgress();
    showChatMode();

    setTimeout(() => {
        showLandingAfterSplash();
        showUpdateModalIfNeeded();
    }, 2800);
}

document.addEventListener("DOMContentLoaded", startApp);