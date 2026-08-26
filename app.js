let players = [];
let selectedPlayer = null;

const state = {
    budget: 500,
    participants: 8,
    rosterLimits: {
        P: 3,
        D: 8,
        C: 8,
        A: 6
    },
    myTeam: {
        name: "La Mia Squadra",
        credits: 500,
        roster: {
            P: [],
            D: [],
            C: [],
            A: []
        }
    },
    auction: {
        active: false,
        player: null,
        currentPrice: 0,
        highestBidder: null
    },
    purchased: []
};


/* =========================
   AVVIO
========================= */

document.addEventListener("DOMContentLoaded", async () => {

    await loadPlayers();

    loadSavedGame();

    initializeInterface();

    renderEverything();

});


/* =========================
   CARICAMENTO GIOCATORI
========================= */

async function loadPlayers() {

    try {

        const response = await fetch("data/players.json");

        if (!response.ok) {
            throw new Error("players.json non trovato");
        }

        players = await response.json();

        console.log(
            "Giocatori caricati:",
            players.length
        );

    } catch (error) {

        console.error(error);

        players = [];

        showMessage(
            "Database giocatori non trovato. Controlla data/players.json"
        );

    }

}


/* =========================
   RICERCA GIOCATORI
========================= */

function searchPlayers(query = "") {

    query = query.trim().toLowerCase();

    let results = players;

    if (query) {

        results = players.filter(player => {

            return (
                player.name.toLowerCase().includes(query) ||
                player.team.toLowerCase().includes(query)
            );

        });

    }

    renderPlayerList(results);

}


/* =========================
   FILTRO RUOLO
========================= */

function filterRole(role) {

    if (role === "ALL") {

        renderPlayerList(players);

        return;
    }

    const results =
        players.filter(
            player => player.role === role
        );

    renderPlayerList(results);

}


/* =========================
   LISTA GIOCATORI
========================= */

function renderPlayerList(list) {

    const container =
        document.getElementById("playersList");

    if (!container) return;

    container.innerHTML = "";

    if (list.length === 0) {

        container.innerHTML = `
            <div class="empty">
                Nessun giocatore trovato.
            </div>
        `;

        return;
    }

    list.forEach(player => {

        const card =
            document.createElement("div");

        card.className = "player-card";

        card.innerHTML = `

            <div class="player-card-main">

                <strong>
                    ${escapeHTML(player.name)}
                </strong>

                <span>
                    ${escapeHTML(player.team)}
                </span>

            </div>

            <div class="player-card-role">
                ${player.role}
            </div>

            <div class="player-card-price">
                ${player.price}
            </div>

        `;

        card.addEventListener(
            "click",
            () => selectPlayer(player)
        );

        container.appendChild(card);

    });

}


/* =========================
   SELEZIONE GIOCATORE
========================= */

function selectPlayer(player) {

    selectedPlayer = player;

    renderPlayerDetails(player);

    calculateAuctionAdvice(player);

}


/* =========================
   SCHEDA GIOCATORE
========================= */

function renderPlayerDetails(player) {

    const container =
        document.getElementById("playerDetails");

    if (!container) return;

    container.innerHTML = `

        <div class="player-detail-header">

            <div>

                <h2>
                    ${escapeHTML(player.name)}
                </h2>

                <p>
                    ${escapeHTML(player.team)}
                    · ${player.role}
                </p>

            </div>

            <div class="player-detail-price">

                ${player.price}

                <small>
                    quotazione
                </small>

            </div>

        </div>


        <div class="stats-grid">

            <div>
                <span>FVM</span>
                <strong>
                    ${player.fvm ?? "-"}
                </strong>
            </div>

            <div>
                <span>Media</span>
                <strong>
                    ${player.media ?? "-"}
                </strong>
            </div>

            <div>
                <span>Fantamedia</span>
                <strong>
                    ${player.fantamedia ?? "-"}
                </strong>
            </div>

            <div>
                <span>Presenze</span>
                <strong>
                    ${player.presenze ?? "-"}
                </strong>
            </div>

            <div>
                <span>Gol</span>
                <strong>
                    ${player.gol ?? "-"}
                </strong>
            </div>

            <div>
                <span>Assist</span>
                <strong>
                    ${player.assist ?? "-"}
                </strong>
            </div>

        </div>


        <div class="analysis">

            <h3>
                Analisi asta
            </h3>

            <div id="auctionAdvice">
                Analisi in corso...
            </div>

        </div>

    `;

}


/* =========================
   ANALISI ASTA
========================= */

function calculateAuctionAdvice(player) {

    const container =
        document.getElementById("auctionAdvice");

    if (!container) return;

    const price =
        Number(player.price || 1);

    /*
        Questa è la prima versione
        del motore.

        Successivamente sostituiremo
        questi coefficienti con un
        sistema molto più sofisticato.
    */

    let idealMin =
        Math.round(price * 0.9);

    let idealMax =
        Math.round(price * 1.4);

    let absoluteMax =
        Math.round(price * 1.7);


    /*
        Consideriamo il budget residuo
    */

    absoluteMax =
        Math.min(
            absoluteMax,
            state.myTeam.credits
        );


    let decision =
        "CONTINUA";

    let level =
        "good";


    if (price >= absoluteMax) {

        decision = "FERMATI";

        level = "danger";

    } else if (price > idealMax) {

        decision = "ATTENZIONE";

        level = "warning";

    }


    container.innerHTML = `

        <div class="advice ${level}">

            <div class="advice-title">
                ${decision}
            </div>

            <div class="advice-row">

                <span>
                    Quotazione
                </span>

                <strong>
                    ${price}
                </strong>

            </div>

            <div class="advice-row">

                <span>
                    Prezzo ideale
                </span>

                <strong>
                    ${idealMin}-${idealMax}
                </strong>

            </div>

            <div class="advice-row">

                <span>
                    Massimo personale
                </span>

                <strong>
                    ${absoluteMax}
                </strong>

            </div>

        </div>

    `;

}


/* =========================
   ASTA
========================= */

function startAuction(player) {

    state.auction = {

        active: true,

        player: player,

        currentPrice: 1,

        highestBidder: null

    };

    renderEverything();

}


function makeBid(teamName, amount) {

    if (!state.auction.active) {

        showMessage(
            "Non c'è nessuna asta attiva."
        );

        return;

    }


    amount =
        Number(amount);


    if (
        amount <=
        state.auction.currentPrice
    ) {

        showMessage(
            "Il rilancio deve essere superiore."
        );

        return;

    }


    state.auction.currentPrice =
        amount;

    state.auction.highestBidder =
        teamName;


    saveGame();

    renderEverything();

}


function finishAuction() {

    if (!state.auction.active) return;

    const auction =
        state.auction;


    if (!auction.highestBidder) {

        showMessage(
            "Nessuno ha acquistato il giocatore."
        );

        return;

    }


    if (
        auction.highestBidder ===
        state.myTeam.name
    ) {

        buyForMyTeam(
            auction.player,
            auction.currentPrice
        );

    }


    state.purchased.push({

        player: auction.player.name,

        role: auction.player.role,

        team: auction.highestBidder,

        price: auction.currentPrice

    });


    state.auction = {

        active: false,

        player: null,

        currentPrice: 0,

        highestBidder: null

    };


    saveGame();

    renderEverything();

}


/* =========================
   ACQUISTO MIA SQUADRA
========================= */

function buyForMyTeam(player, price) {

    const role =
        player.role;


    if (
        state.myTeam.roster[role].length >=
        state.rosterLimits[role]
    ) {

        showMessage(
            "Hai già completato questo ruolo."
        );

        return false;

    }


    if (
        price >
        state.myTeam.credits
    ) {

        showMessage(
            "Non hai abbastanza crediti."
        );

        return false;

    }


    state.myTeam.credits -=
        price;


    state.myTeam.roster[role].push({

        name: player.name,

        price: price

    });


    return true;

}


/* =========================
   PIANO B
========================= */

function getAlternatives(player) {

    const sameRole =
        players.filter(
            p =>
                p.role === player.role &&
                p.name !== player.name
        );


    return sameRole
        .sort(
            (a, b) =>
                calculatePlayerScore(b) -
                calculatePlayerScore(a)
        )
        .slice(0, 5);

}


/* =========================
   SCORE
========================= */

function calculatePlayerScore(player) {

    let score = 0;


    score +=
        Number(player.fvm || 0) * 0.45;


    score +=
        Number(player.fantamedia || 0) * 3;


    score +=
        Number(player.media || 0) * 2;


    score +=
        Number(player.presenze || 0) * 0.15;


    return score;

}


/* =========================
   SALVATAGGIO
========================= */

function saveGame() {

    localStorage.setItem(
        "fantacalcio_state",
        JSON.stringify(state)
    );

}


function loadSavedGame() {

    const saved =
        localStorage.getItem(
            "fantacalcio_state"
        );


    if (!saved) return;


    try {

        const parsed =
            JSON.parse(saved);

        Object.assign(
            state,
            parsed
        );

    } catch (error) {

        console.error(
            "Errore caricamento salvataggio",
            error
        );

    }

}


/* =========================
   INTERFACCIA
========================= */

function initializeInterface() {

    const search =
        document.getElementById("playerSearch");

    if (search) {

        search.addEventListener(
            "input",
            e => searchPlayers(e.target.value)
        );

    }


    searchPlayers();

}


/* =========================
   RENDER GENERALE
========================= */

function renderEverything() {

    renderPlayerList(
        players
    );

    if (selectedPlayer) {

        renderPlayerDetails(
            selectedPlayer
        );

        calculateAuctionAdvice(
            selectedPlayer
        );

    }

    renderMyTeam();

    renderAuction();

}


/* =========================
   MIA ROSA
========================= */

function renderMyTeam() {

    const container =
        document.getElementById("myRoster");

    if (!container) return;

    container.innerHTML = "";


    ["P", "D", "C", "A"].forEach(role => {

        const box =
            document.createElement("div");

        box.className =
            "roster-role";


        box.innerHTML = `

            <h3>
                ${role}
                ${state.myTeam.roster[role].length}
                /
                ${state.rosterLimits[role]}
            </h3>

        `;


        state.myTeam.roster[role]
            .forEach(player => {

                box.innerHTML += `

                    <div class="roster-player">

                        <span>
                            ${escapeHTML(player.name)}
                        </span>

                        <strong>
                            ${player.price}
                        </strong>

                    </div>

                `;

            });


        container.appendChild(box);

    });


    const credits =
        document.getElementById("myCredits");

    if (credits) {

        credits.textContent =
            state.myTeam.credits;

    }

}


/* =========================
   ASTA UI
========================= */

function renderAuction() {

    const container =
        document.getElementById("auctionPanel");

    if (!container) return;


    if (!state.auction.active) {

        container.innerHTML = `

            <div class="empty">
                Nessuna asta attiva.
            </div>

        `;

        return;

    }


    const auction =
        state.auction;


    const alternatives =
        getAlternatives(
            auction.player
        );


    container.innerHTML = `

        <div class="live-auction">

            <h2>
                ${escapeHTML(
                    auction.player.name
                )}
            </h2>

            <p>
                ${auction.player.role}
                ·
                ${auction.player.team}
            </p>

            <div class="live-price">

                ${auction.currentPrice}

            </div>

            <div>
                In testa:
                <strong>
                    ${
                        auction.highestBidder ||
                        "Nessuno"
                    }
                </strong>
            </div>


            <div class="alternatives">

                <h3>
                    Piano B
                </h3>

                ${
                    alternatives
                    .map(
                        p => `
                            <div>
                                ${escapeHTML(p.name)}
                                -
                                ${p.price}
                            </div>
                        `
                    )
                    .join("")
                }

            </div>

        </div>

    `;

}


/* =========================
   UTILITY
========================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;

}


function showMessage(message) {

    console.log(message);

    alert(message);

}
