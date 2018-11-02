/*globals get_browser, default_width, default_height*/

//https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript#answer-10074204
// TODO: need this?
// function zeroPad(num, places) {
//     "use strict";
//     if (num.toString().length >= places) {
//         return num;
//     }
//     return String(Math.pow(10, places) + Math.floor(num)).substring(1);
// }

//https://stackoverflow.com/questions/19469881/remove-all-event-listeners-of-specific-type/46986927#46986927
function stopAllListeners(element, type) {
    element.addEventListener(type, function (event) {
        event.stopPropagation();
    }, true);
}

var currentPanel = null;
var background = get_browser().extension.getBackgroundPage();

function initBodySize() {
    "use strict";
    if (localStorage.bodyWidth === undefined || localStorage.bodyWidth === 0) {
        localStorage.bodyWidth = default_width;
    }
    if (localStorage.bodyHeight === undefined || localStorage.bodyHeight === 0) {
        localStorage.bodyHeight = default_height;
    }
    let bodyWidth = document.getElementById("bodyWidth");
    let bodyHeight = document.getElementById("bodyWidth");

    bodyWidth.value = localStorage.bodyWidth;
    bodyHeight.value = localStorage.bodyHeight;
}

function goToPanel(id) {
    "use strict";
    let panel = document.getElementById(id);
    if (currentPanel !== null) {
        if (currentPanel.id === id) {
            return;
        }
        //hide the other panel
        currentPanel.hidden = true;
    }
    currentPanel = panel;
    currentPanel.hidden = false;
}

function goToLogin() {
    "use strict";
    goToPanel("rightPanel");
}

function goToStations() {
    "use strict";
    goToPanel("midPanel");
}

function goToPlayer() {
    "use strict";
    goToPanel("leftPanel");
}

function clearHistory() {
    "use strict";
    let historyList = document.getElementById("historyList");
    while (historyList.hasChildNodes()) {
        historyList.removeChild(historyList.firstChild);
    }
}

function downloadSong(url, title) {
    "use strict";
    //making an anchor tag and clicking it allows the download dialog to work and save the file with the song"s name

    //trim the title of the song to 15 characters... not a perfect solution, but there were issues with it at full length
    title = title.substring(0, 15);

    let a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", title + ".mp4");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function updateHistory() {
    "use strict";
    clearHistory();

    var history = document.getElementById("historyList");
    background.prevSongs.reverse().forEach(function (song, i) {
        var row = history.insertRow();

        var imgCell = row.insertCell();
        var image = document.createElement("img");
        image.setAttribute("src", song.albumArtUrl);
        image.setAttribute("class", "historyCoverArt historyInfoLink");
        image.setAttribute("data-history", i);
        imgCell.appendChild(image);

        var nameCell = row.insertCell();
        nameCell.noWrap = true;
        nameCell.style = "max-width:" + (document.body.offsetWidth * 0.5) + "px";

        var name = document.createElement("span");
        name.setAttribute("data-history", i);
        name.setAttribute("class", "historyInfoLink historyTitle");
        nameCell.appendChild(name);

        var nameText = document.createTextNode(song.songName);
        name.appendChild(nameText);

        var likeCell = row.insertCell();
        var likeImage = document.createElement("img");
        likeImage.setAttribute("src", "images/thumbup.png");
        likeImage.setAttribute("data-history", i);
        likeImage.setAttribute("class", "hoverImg historyLike");
        likeCell.appendChild(likeImage);

        var dlCell = row.insertCell();
        var dlImage = document.createElement("img");
        dlImage.setAttribute("src", "images/download.png");
        dlImage.setAttribute("data-history", i);
        dlImage.setAttribute("class", "hoverImg historyDownload");
        dlCell.appendChild(dlImage);
    });

    let historyLinks = document.getElementsByClassName("historyInfoLink");
    for (let i = 0; i < historyLinks.length; ++i) {
        historyLinks[i].addEventListener("click", function (e) {
            var historyNum = e.target.dataset.history;
            var song = background.prevSongs[historyNum];
            get_browser().tabs.create({
                "url": song.songDetailUrl
            });
        });
    }

    let historyLikes = document.getElementsByClassName("historyLike");
    for (let i = 0; i < historyLikes.length; ++i) {
        historyLikes[i].addEventListener("click", function (e) {
            var historyNum = e.target.dataset.history;
            background.addFeedback(historyNum, true);

            stopAllListeners(e.target, "click");
            e.target.src = "images/thumbUpCheck.png";
        });
    }

    let historyDownload = document.getElementsByClassName("historyLike");
    for (let i = 0; i < historyDownload.length; ++i) {
        historyDownload[i].addEventListener("click", function (e) {
            var historyNum = e.target.dataset.history;
            var song = background.prevSongs[historyNum];

            downloadSong(song.audioUrlMap.highQuality.audioUrl, song.songName);
        });
    }
}

function goToHistory() {
    "use strict";
    goToPanel("historyPanel");
    updateHistory();
}

function addStations() {
    "use strict";
    background.stationList.forEach(function (station) {
        let stationListE = document.getElementById("stationList");
        stationListE.appendChild(new Option(station.stationName, station.stationToken));
    });
}

function updatePlayer() {
    "use strict";
    if (background.currentSong) {
        let coverArt = document.getElementById("coverArt");
        coverArt.addEventListener("click", function () {
            get_browser().tabs.create({
                "url": background.currentSong.albumDetailUrl
            });
        });
        coverArt.src = background.currentSong.albumArtUrl;

        let artistLink = document.getElementById("artistLink");
        artistLink.innerText = background.currentSong.artistName;
        artistLink.addEventListener("click", function () {
            get_browser().tabs.create({
                "url": background.currentSong.artistDetailUrl
            });
        });

        let titleLink = document.getElementById("titleLink");
        titleLink.innerText = background.currentSong.songName;
        titleLink.addEventListener("click", function () {
            get_browser().tabs.create({
                "url": background.currentSong.songDetailUrl
            });
        });

        document.getElementById("dash").innerText = " - ";

        let tUpButton = document.getElementById("tUpButton");
        //let tDownButton = document.getElementById("tUpButton");

        if (background.currentSong.songRating) {
            stopAllListeners(tUpButton, "click");
            tUpButton.src = "images/thumbUpCheck.png";
        } else {
            tUpButton.src = "images/thumbup.png";
            tUpButton.addEventListener("click", function () {
                background.addFeedback(-1, true);
                tUpButton.src = "images/thumbUpCheck.png";
                stopAllListeners(tUpButton, "click");
            });
        }
    }

    let playButton = document.getElementById("playButton");
    let pauseButton = document.getElementById("playButton");
    if (background.mp3Player.paused) {
        playButton.hidden = false;
        pauseButton.hidden = true;
    } else {
        playButton.hidden = true;
        pauseButton.hidden = false;
    }

    let scrollerText = document.getElementById("scrollerText");
    scrollerText.addEventListener("mouseover", function (e) {
        if (e.target.offsetWidth > e.target.parentElement.offsetWidth) {
            var newLeft = e.target.parentElement.offsetWidth - e.target.offsetWidth;
            var speed = Math.round((e.target.offsetWidth - e.target.parentElement.offsetWidth + e.target.offsetLeft) * 10);
            setTimeout(function() {
                e.target.animate([
                    {left: newLeft}
                ], {
                    duration: speed,
                });
            }, 500);
        }
    });
    scrollerText.addEventListener("mouseout", function (e) {
        //move it to left immediately
        e.target.style.left = 0;
    });

    //let scrubber = document.getElementById("scrubber");
    //scrubber.THIS IS THE HARDEST PART = FUCK;
    //TODO: 
    // $("#scrubber").slider({
    //     value: 0
    // });
}

function drawPlayer() {
    "use strict";
    //TODO: fuuuk

    // var curMinutes = Math.floor(background.mp3Player.currentTime / 60),
    //     curSecondsI = Math.ceil(background.mp3Player.currentTime % 60),
    //     curSeconds = zeroPad(curSecondsI.length === 1
    //         ? "0" + curSecondsI
    //         : curSecondsI, 2),
    //     totalMinutes = Math.floor(background.mp3Player.duration / 60),
    //     totalSecondsI = Math.ceil(background.mp3Player.duration % 60),
    //     totalSeconds = zeroPad(totalSecondsI.length === 1
    //         ? "0" + totalSecondsI
    //         : totalSecondsI, 2);

    // $("#scrubber").slider({
    //     value: (background.mp3Player.currentTime / background.mp3Player.duration) * 100
    // }).attr("title", curMinutes + ":" + curSeconds + "/" + totalMinutes + ":" + totalSeconds);
}

document.addEventListener("DOMContentLoaded", function () {
    "use strict";
    // document.body.addEventListener("click")
    // UWOTM8???
    // $("body").bind("click", function (e) {
    //     if (e.target.id !== "artistLink" && e.target.id !== "titleLink") {
    //         $(".details").hide();
    //     }
    // });
    initBodySize();
    document.body.style.width = localStorage.bodyWidth + "px";
    document.body.style.height = localStorage.bodyHeight + "px";

    let scrollerContainer = document.getElementById("nowPlayingContainer");
    scrollerContainer.style.width = (localStorage.bodyWidth * 0.6) + "px";

    let panels = document.getElementsByClassName("panel");
    for(let i = 0; i < panels.length; ++i) {
        panels[i].style.width = localStorage.bodyWidth + "px";
        panels[i].style.height = localStorage.bodyHeight + "px";

        panels[i].hidden = true;
    }

    let historyDiv = document.getElementById("historyDiv");
    historyDiv.style.height = localStorage.bodyHeight + "px";

    let historyList = document.getElementById("historyList");
    historyDiv.style.width = (localStorage.bodyWidth - 20) + "px";
    historyList.style.width = (localStorage.bodyWidth - 20) +  + "px";

    //fuuuuuuuk
    let volume = document.getElementById("volume");
    volume.style.height = (localStorage.bodyHeight - 5)  + "px";

    let coverArt = document.getElementById("coverArt");
    coverArt.style.minWidth = Math.min(localStorage.bodyHeight * 75, localStorage.bodyWidth * .1) + "px";

    let playButton = document.getElementById("playButton");
    let pauseButton = document.getElementById("pauseButton");
    if (background.mp3Player.paused) {
        playButton.hidden = false;
        pauseButton.hidden = true;
    } else {
        playButton.hidden = true;
        pauseButton.hidden = false;
    }

    //TODO: fuuuuuuuk
    // $("#scrubber").slider({
    //     range: "min",
    //     min: 0,
    //     slide: function (ignore, ui) {
    //         background.mp3Player.currentTime = background.mp3Player.duration * (ui.value / 100);
    //     },
    //     change: function (ignore, ui) {
    //         $(ui.handle).removeClass("ui-state-focus");
    //     }
    // });

    playButton.addEventListener("click", function () {
        play_audio();
    });
    pauseButton.addEventListener("click", function () {
        pause_audio();
    });

    let skipButton = document.getElementById("skipButton");
    skipButton.addEventListener("click", background.nextSong);

    let tUpButton = document.getElementById("tUpButton");
    tUpButton.addEventListener("click", function () {
        background.addFeedback(-1, true);
        if (background.currentSong.songRating === true) {
            stopAllListeners(tUpButton, "click");
            tUpButton.src = "images/thumbUpCheck.png";
        }
    });

    let tDownButton = document.getElementById("tDownButton");
    tDownButton.addEventListener("click", function () {
        background.addFeedback(-1, false);
        setTimeout(function () {
            background.nextSong();
        }, 1000); // Small delay to stop extension from freezing for some reason
    });

    let sleepButton = document.getElementById("sleepButon");
    sleepButton.addEventListener("click", function () {
        background.sleepSong();
        background.nextSong();
    });

    let downloadButton = document.getElementById("downloadButton");
    downloadButton.addEventListener("click", function () {
        background.downloadSong();
    });

    let moreInfoButton = document.getElementById("moreInfoButton");
    moreInfoButton.addEventListener("click", function() {
        window.open("options.htm", "_blank");
    });

    //TODO: fuuuuuuuk
    // $("#volume").slider({
    //     orientation: "vertical",
    //     range: "min",
    //     min: 0,
    //     max: 70,
    //     value: (localStorage.volume)
    //         ? localStorage.volume * 100
    //         : 20,
    //     slide: function (ignore, ui) {
    //         background.mp3Player.volume = ui.value / 100;
    //     },
    //     stop: function (ignore, ui) {
    //         $(ui.handle).removeClass("ui-state-focus");
    //         localStorage.volume = ui.value / 100;
    //     }
    // });

    let nextButton = document.getElementById("nextButton");
    nextButton.addEventListener("click", function () {
        //move to midpanel
        goToStations();
    });

    let stationList = document.getElementById("stationList");
    stationList.addEventListener("change", function () {
        background.nextSongStation(stationList.selectedOptions[0].value);
        goToPlayer();
    });

    let unWarning = document.getElementById("unWarning");
    unWarning.hidden = true;

    let pwWarning = document.getElementById("pwWarning");
    pwWarning.hidden = true;

    let rightWarnRow = document.getElementById("rightWarnRow");
    rightWarnRow.hidden = true;

    let login = document.getElementById("login");
    login.addEventListener("submit", function () {
        let username = document.getElementById("username");
        let password = document.getElementById("password");

        localStorage.username = username.value;
        localStorage.password = password.value;
        background.partnerLogin();
        if (background.userAuthToken === "") {
            unWarning.hidden = false;
            pwWarning.hidden = false;
            rightWarnRow.hidden = false;

            //TODO: WHY?
            // $("#username").css({
            //     "padding-left": "16px",
            //     "width": "216px"
            // });
            // $("#password").css({
            //     "padding-left": "16px",
            //     "width": "216px"
            // });
            return false;
        } else {
            addStations();
            //move to mid panel
            goToStations();
            return false;
        }
    });

    if (background.stationList !== undefined) {
        addStations();
    }
    if (localStorage.username === undefined
            || localStorage.password === undefined
            || background.userAuthToken === undefined
            || localStorage.username.length === 0
            || localStorage.password.length === 0
            || background.userAuthToken.length === 0) {
        goToLogin();
    } else {
        if (!localStorage.lastStation) {
            goToStations();
        }
        if (localStorage.lastStation) {
            goToPlayer();
        }
    }

    let prevButton = document.getElementById("prevButton");
    prevButton.addEventListener("click", function () {
        goToPlayer();
    });

    let historyButton = document.getElementById("history");
    historyButton.addEventListener("click", function () {
        goToHistory();
    });

    let noHistoryButton = document.getElementById("noHistory");
    noHistoryButton.addEventListener("click", function () {
        goToPlayer();
    });

    if (background.mp3Player.src !== "") {
        if (background.mp3Player.currentTime > 0) {
            updatePlayer();
            drawPlayer();
        }
    } else {
        updatePlayer();
    }
});

function pause_audio () {
    background.mp3Player.pause();

    let playButton = document.getElementById("playButton");
    let pauseButton = document.getElementById("pauseButton");

    pauseButton.hidden = true;
    playButton.hidden = false;
}

function play_audio () {
    background.play(localStorage.lastStation);

    let playButton = document.getElementById("playButton");
    let pauseButton = document.getElementById("pauseButton");

    pauseButton.hidden = false;
    playButton.hidden = true;
}

background.setCallbacks(updatePlayer, drawPlayer, downloadSong);