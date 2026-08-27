let songs = [];

let currentSong = null;
let audio = null;

let score = 0;
let streak = 0;
let round = 1;

const listenTimes = [
    0.5,
    1,
    2,
    4,
    8,
    15
];

let listenTimeIndex = 0;
let listenTime = listenTimes[listenTimeIndex];

let gameFinished = false;
let isLoading = false;

let stopTimeout = null;
let animationFrame = null;


/* =========================
   ELEMEK
========================= */

const playButton =
    document.getElementById("playButton");

const guessInput =
    document.getElementById("guessInput");

const results =
    document.getElementById("results");

const moreButton =
    document.getElementById("moreButton");

const giveUpButton =
    document.getElementById("giveUpButton");

const nextButton =
    document.getElementById("nextButton");

const message =
    document.getElementById("message");

const listenTimeElement =
    document.getElementById("listenTime");

const currentTimeElement =
    document.getElementById("currentTime");

const progressBar =
    document.getElementById("progressBar");

const scoreElement =
    document.getElementById("score");

const streakElement =
    document.getElementById("streak");

const roundElement =
    document.getElementById("round");


/* =========================
   DALOK BETÖLTÉSE
========================= */

async function loadSongs() {

    try {

        const response =
            await fetch("./data/songs.json");


        if (!response.ok) {

            throw new Error(
                "Nem sikerült betölteni a songs.json fájlt"
            );

        }


        songs =
            await response.json();


        if (!Array.isArray(songs)) {

            throw new Error(
                "A songs.json nem megfelelő formátumú"
            );

        }


        if (songs.length === 0) {

            throw new Error(
                "Nincs dal a songs.json fájlban"
            );

        }


        console.log(
            `${songs.length} dal betöltve`
        );


        await startRound();

    }
    catch (error) {

        console.error(
            "Hiba a daladatbázis betöltésekor:",
            error
        );


        message.innerText =
            "❌ Nem sikerült betölteni a daladatbázist.";

    }

}


/* =========================
   ZENEI ELŐNÉZET KERESÉSE
========================= */

async function loadPreview(song) {

    const query =
        `${song.artist} ${song.title}`;


    const url =
        `https://itunes.apple.com/search?` +
        `term=${encodeURIComponent(query)}` +
        `&country=HU` +
        `&media=music` +
        `&entity=song` +
        `&limit=10`;


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Nem sikerült lekérni a zenei előnézetet"
        );

    }


    const data =
        await response.json();


    if (
        !data.results ||
        data.results.length === 0
    ) {

        throw new Error(
            "Nem található előnézet"
        );

    }


    /*
        Megpróbáljuk megtalálni
        az első olyan találatot,
        amelyhez tartozik preview URL.
    */

    const result =
        data.results.find(item => {

            return item.previewUrl;

        });


    if (!result) {

        throw new Error(
            "Ehhez a dalhoz nincs előnézet"
        );

    }


    return result.previewUrl;

}


/* =========================
   LEJÁTSZÁS LEÁLLÍTÁSA
========================= */

function stopPlayback() {

    if (stopTimeout !== null) {

        clearTimeout(stopTimeout);

        stopTimeout = null;

    }


    if (animationFrame !== null) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;

    }


    if (audio) {

        audio.pause();

        audio.currentTime = 0;

    }

}


/* =========================
   ÚJ KÖR
========================= */

async function startRound() {

    if (isLoading) {

        return;

    }


    isLoading = true;


    try {

        stopPlayback();


        let newSong;


        /*
            Másik dalt választunk,
            mint az előző körben.
        */

        do {

            newSong =
                songs[
                    Math.floor(
                        Math.random() *
                        songs.length
                    )
                ];

        }
        while (

            songs.length > 1 &&
            currentSong !== null &&
            newSong.id === currentSong.id

        );


        currentSong =
            newSong;


        /*
            Hallgatási idő visszaállítása.
        */

        listenTimeIndex = 0;

        listenTime =
            listenTimes[
                listenTimeIndex
            ];


        gameFinished = false;


        guessInput.value = "";

        results.innerHTML = "";


        message.innerText =
            "🎵 Zene betöltése...";


        message.className =
            "message";


        /*
            Gombok állapota.
        */

        nextButton.classList.add(
            "hidden"
        );


        nextButton.disabled =
            false;


        playButton.disabled =
            true;


        moreButton.disabled =
            true;


        giveUpButton.disabled =
            true;


        updateStats();

        updateListenTime();

        resetPlaybackProgress();


        /*
            Zene előnézet lekérése.
        */

        const previewUrl =
            await loadPreview(
                currentSong
            );


        audio =
            new Audio(
                previewUrl
            );


        /*
            Betöltési hiba kezelése.
        */

        audio.addEventListener(
            "error",
            () => {

                console.error(
                    "Hiba a zene betöltésekor."
                );


                message.innerText =
                    "❌ Nem sikerült betölteni ezt a zenét.";


                message.className =
                    "message wrong";


                nextButton.classList.remove(
                    "hidden"
                );

            }
        );


        /*
            A játék aktiválása.
        */

        playButton.disabled =
            false;


        moreButton.disabled =
            false;


        giveUpButton.disabled =
            false;


        message.innerHTML = `
            🎧 Hallgass meg
            <strong>${listenTime} mp-et!</strong>
        `;


        message.className =
            "message";

    }
    catch (error) {

        console.error(
            "Hiba az új kör betöltésekor:",
            error
        );


        /*
            Ha egy dalhoz nincs előnézet,
            a következő dal gomb akkor is
            használható marad.
        */

        message.innerHTML = `
            ❌ Nem sikerült betölteni ezt a dalt.
        `;


        message.className =
            "message wrong";


        nextButton.classList.remove(
            "hidden"
        );


        nextButton.disabled =
            false;

    }
    finally {

        /*
            FONTOS:
            Akkor is kikapcsoljuk a loadingot,
            ha valamilyen hiba történt.
        */

        isLoading = false;

    }

}


/* =========================
   ZENE LEJÁTSZÁSA
========================= */

function playSong() {

    if (
        gameFinished ||
        !audio ||
        isLoading
    ) {

        return;

    }


    stopPlayback();


    resetPlaybackProgress();


    audio.currentTime = 0;


    audio.play()
        .then(() => {

            function updateTime() {

                if (!audio) {

                    return;

                }


                const current =
                    Math.min(
                        audio.currentTime,
                        listenTime
                    );


                currentTimeElement.innerText =
                    current.toFixed(1);


                const percentage =
                    Math.min(
                        (current / listenTime) * 100,
                        100
                    );


                progressBar.style.width =
                    `${percentage}%`;


                if (
                    current < listenTime &&
                    !audio.paused
                ) {

                    animationFrame =
                        requestAnimationFrame(
                            updateTime
                        );

                }

            }


            updateTime();

        })
        .catch(error => {

            console.error(
                "Nem indítható a hang:",
                error
            );

        });


    /*
        Ennyi idő után megállítjuk.
    */

    stopTimeout =
        setTimeout(() => {

            if (!audio) {

                return;

            }


            audio.pause();


            if (animationFrame !== null) {

                cancelAnimationFrame(
                    animationFrame
                );

                animationFrame = null;

            }


            currentTimeElement.innerText =
                listenTime.toFixed(1);


            progressBar.style.width =
                "100%";


            stopTimeout = null;

        },
        listenTime * 1000);

}


/* =========================
   KERESÉS
========================= */

function showResults(query) {

    results.innerHTML = "";


    query =
        query
            .toLowerCase()
            .trim();


    if (query.length === 0) {

        return;

    }


    const matches =
        songs
            .filter(song => {

                const text =
                    `${song.artist} ${song.title}`
                        .toLowerCase();


                return text.includes(
                    query
                );

            })
            .slice(0, 6);


    matches.forEach(song => {

        const result =
            document.createElement(
                "div"
            );


        result.className =
            "result";


        result.innerHTML = `

            <strong>
                ${song.title}
            </strong>

            <span class="result-artist">
                ${song.artist}
            </span>

        `;


        result.addEventListener(
            "click",
            () => {

                selectSong(song);

            }
        );


        results.appendChild(
            result
        );

    });

}


/* =========================
   DAL KIVÁLASZTÁSA
========================= */

function selectSong(selectedSong) {

    if (gameFinished) {

        return;

    }


    guessInput.value =
        `${selectedSong.artist} – ${selectedSong.title}`;


    results.innerHTML = "";


    if (
        selectedSong.id ===
        currentSong.id
    ) {

        correctAnswer();

    }
    else {

        wrongAnswer();

    }

}


/* =========================
   HELYES VÁLASZ
========================= */

function correctAnswer() {

    gameFinished = true;


    stopPlayback();


    const pointsTable = [
        100,
        80,
        60,
        40,
        20,
        10
    ];


    const points =
        pointsTable[
            listenTimeIndex
        ];


    score += points;


    streak++;


    message.innerHTML = `

        <div class="answer-result">

            <div class="answer-status">
                🎉 Helyes válasz!
            </div>

            <div class="answer-song">
                ${currentSong.artist}
                –
                ${currentSong.title}
            </div>

            <div class="answer-points">
                +${points} pont
            </div>

        </div>

    `;


    message.className =
        "message correct";


    nextButton.classList.remove(
        "hidden"
    );


    updateStats();

}


/* =========================
   ROSSZ VÁLASZ
========================= */

function wrongAnswer() {

    streak = 0;


    message.innerHTML = `

        ❌ Nem ez volt!

        <br>

        Próbálj több időt hallgatni.

    `;


    message.className =
        "message wrong";


    updateStats();

}


/* =========================
   TÖBBET HALLGATOK
========================= */

function increaseListenTime() {

    if (
        gameFinished ||
        isLoading
    ) {

        return;

    }


    /*
        Ha éppen szól a zene,
        először leállítjuk.
    */

    stopPlayback();


    if (
        listenTimeIndex <
        listenTimes.length - 1
    ) {

        listenTimeIndex++;


        listenTime =
            listenTimes[
                listenTimeIndex
            ];


        updateListenTime();

        resetPlaybackProgress();


        message.innerHTML = `
            🎧 Most már
            <strong>${listenTime} mp-et</strong>
            hallgathatsz.
        `;


        message.className =
            "message";


        /*
            Ha elértük a maximumot,
            a következő kattintásnál
            már letiltjuk.
        */

        if (
            listenTimeIndex ===
            listenTimes.length - 1
        ) {

            moreButton.disabled =
                true;

        }

    }

}


/* =========================
   FELADOM
========================= */

function giveUp() {

    if (gameFinished) {

        return;

    }


    gameFinished = true;


    streak = 0;


    stopPlayback();


    message.innerHTML = `

        <div class="answer-result">

            <div class="answer-status">
                😢 A helyes válasz:
            </div>

            <div class="answer-song">
                ${currentSong.artist}
                –
                ${currentSong.title}
            </div>

        </div>

    `;


    message.className =
        "message wrong";


    nextButton.classList.remove(
        "hidden"
    );


    updateStats();

}


/* =========================
   HALLGATÁSI IDŐ FRISSÍTÉSE
========================= */

function updateListenTime() {

    listenTimeElement.innerText =
        listenTime;

}


/* =========================
   LEJÁTSZÁS ÁLLAPOT NULLÁZÁSA
========================= */

function resetPlaybackProgress() {

    currentTimeElement.innerText =
        "0.0";


    progressBar.style.width =
        "0%";

}


/* =========================
   STATISZTIKÁK
========================= */

function updateStats() {

    scoreElement.innerText =
        score;


    streakElement.innerText =
        `${streak} 🔥`;


    roundElement.innerText =
        round;

}


/* =========================
   ESEMÉNYEK
========================= */

playButton.addEventListener(
    "click",
    playSong
);


guessInput.addEventListener(
    "input",
    event => {

        showResults(
            event.target.value
        );

    }
);


moreButton.addEventListener(
    "click",
    increaseListenTime
);


giveUpButton.addEventListener(
    "click",
    giveUp
);


/*
   KÖVETKEZŐ DAL
*/

nextButton.addEventListener(
    "click",
    async () => {

        /*
            Ne lehessen többször
            gyorsan rákattintani.
        */

        if (isLoading) {

            return;

        }


        nextButton.disabled =
            true;


        round++;


        updateStats();


        await startRound();


        /*
            A startRound végén
            újra használható.
        */

        nextButton.disabled =
            false;

    }
);


/*
   ENTER = első találat kiválasztása
*/

guessInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            const firstResult =
                results.querySelector(
                    ".result"
                );


            if (firstResult) {

                firstResult.click();

            }

        }

    }
);


/*
   Találatok bezárása,
   ha máshová kattintasz.
*/

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".search-container"
            )
        ) {

            results.innerHTML = "";

        }

    }
);


/* =========================
   JÁTÉK INDÍTÁSA
========================= */

loadSongs();