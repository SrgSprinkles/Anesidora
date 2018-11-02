/*globals get_browser, default_width, default_height, ScrubberView*/

//https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript#answer-10074204
//pad a number with zeroes
function zeroPad(num, places) {
    "use strict";
    if (num.toString().length >= places) {
        return num;
    }
    return String(Math.pow(10, places) + Math.floor(num)).substring(1);
}

//https://stackoverflow.com/questions/19469881/remove-all-event-listeners-of-specific-type/46986927#46986927
//stop all listeners on a given element
function stopAllListeners(element, type) {
    "use strict"
    element.addEventListener(type, function (event) {
        event.stopPropagation();
    }, true);
}

//The currently visible panel
var currentPanel = null;
var background = get_browser().extension.getBackgroundPage();
var stop_draw = false;

// Initialize scrubber for mp3 player
var scrubber = new ScrubberView();
scrubber.min(0);
scrubber.max(100);

// Initialize scrubber for volume
var volume = new ScrubberView();
volume.min(0);
volume.max(100);
volume.value(localStorage.volume ? localStorage.volume * 100 : 20);
volume.orientation("vertical");

function initBodySize() {
    /**
     * Initialize the body element with the stored sizes. All other elements are sized based on this
     */
    "use strict";
    if (localStorage.bodyWidth === undefined || localStorage.bodyWidth === 0) {
        localStorage.bodyWidth = default_width;
    }
    if (localStorage.bodyHeight === undefined || localStorage.bodyHeight === 0) {
        localStorage.bodyHeight = default_height;
    }

    document.body.style.width = localStorage.bodyWidth;
    document.body.style.height = localStorage.bodyHeight;
}

function goToPanel(id) {
    /**
     * Direct the view to the given panel id. Does so by hiding other panels and showing visible
     * 
     * id: The panel to direct to
     */
    "use strict";
    let panel = document.getElementById(id);
    if (currentPanel !== null) {
        if (currentPanel.id === id) {
            return;
        }
        //hide the other panel
        currentPanel.style.display = "none";
    }
    currentPanel = panel;
    currentPanel.style.display = "block";
}

function goToLogin() {
    /**
     * Direct to the login panel
     */
    "use strict";
    goToPanel("rightPanel");
}

function goToStations() {
    /**
     * Direct to the stations panel
     */
    "use strict";
    goToPanel("midPanel");
}

function goToPlayer() {
    /**
     * Direct to the player panel
     */
    "use strict";
    goToPanel("leftPanel");
}

function clearHistory() {
    /**
     * Empty the current song history
     */
    "use strict";
    let historyList = document.getElementById("historyList");
    while (historyList.hasChildNodes()) {
        historyList.removeChild(historyList.firstChild);
    }
}

function downloadSong(url, title) {
    /**
     * Download a song
     */
    "use strict";
    //making an anchor tag and clicking it allows the download dialog to work and save the file with the song's name

    //trim the title of the song to 15 characters... not a perfect solution, but there were issues with it at full length
    title = title.substring(0, 15);

    let a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", title + ".mp4");
    a.setAttribute("target", "_blank");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function updateHistory() {
    /**
     * Add the most recent songs to the history
     */
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
    /**
     * Direct to the history panel
     */
    "use strict";
    goToPanel("historyPanel");
    updateHistory();
}

function addStations() {
    /**
     * Add the stations from pandora to the station list UI element
     */
    "use strict";
    background.stationList.forEach(function (station) {
        let stationListE = document.getElementById("stationList");
        stationListE.appendChild(new Option(station.stationName, station.stationToken));
    });
}

function updatePlayer() {
    /**
     * Update the details of the player after a new song is started
     */
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

    let nowPlaying = document.getElementById("nowPlaying");
    nowPlaying.addEventListener("mouseover", function (e) {
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
    nowPlaying.addEventListener("mouseout", function (e) {
        //move it to left immediately
        e.target.style.left = 0;
    });

    scrubber.value(0);
}

function drawPlayer() {
    /**
     * Draw the player. Called when the mp3Player updates time
     */
    "use strict";
    let currentTime = background.mp3Player.currentTime;
    let duration = background.mp3Player.duration;

    if (stop_draw) {
        return;
    }

    let curMinutes = zeroPad(Math.floor(currentTime / 60), 2),
        curSeconds = zeroPad(Math.ceil(currentTime % 60), 2),
        totalMinutes = zeroPad(Math.floor(duration / 60), 2),
        totalSeconds = zeroPad(Math.ceil(duration % 60), 2);

    scrubber.value((currentTime / duration) * 100);
    scrubber.elt.title = curMinutes + ":" + curSeconds + "/" + totalMinutes + ":" + totalSeconds;
}

function updatePlayPause() {
    /**
     * Update the play-pause buttons to ensure that they're in sync with the state of the mp3Player
     */
    let playButton = document.getElementById("playButton");
    let pauseButton = document.getElementById("pauseButton");

    if (background.mp3Player.paused) {
        playButton.style.display = "block";
        pauseButton.style.display = "none";
    } else {
        playButton.style.display = "none";
        pauseButton.style.display = "block";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    "use strict";
    // get initial body size and adjust it to fit
    initBodySize();
    document.body.style.width = localStorage.bodyWidth + "px";
    document.body.style.height = localStorage.bodyHeight + "px";

    //Adjust the scrolling ticker (currently broken) to be 60% of the size of the body
    let scrollerContainer = document.getElementById("nowPlayingContainer");
    scrollerContainer.style.width = (localStorage.bodyWidth * 0.6) + "px";

    //Each panel is the same size as the body.
    //Don't display any of them right now
    let panels = document.getElementsByClassName("panel");
    for(let i = 0; i < panels.length; ++i) {
        panels[i].style.width = localStorage.bodyWidth + "px";
        panels[i].style.height = localStorage.bodyHeight + "px";

        panels[i].style.display = "none";
    }

    let historyDiv = document.getElementById("historyDiv");
    historyDiv.style.height = localStorage.bodyHeight + "px";

    //The list of history elements is slightly smaller than the body
    let historyList = document.getElementById("historyList");
    historyDiv.style.width = (localStorage.bodyWidth - 20) + "px";
    historyList.style.width = (localStorage.bodyWidth - 20) +  + "px";

    //The volume slider is slightly smaller than the body
    let volumeCell = document.getElementById("volumeCell");
    volumeCell.appendChild(volume.elt);
    volume.elt.style.height = (localStorage.bodyHeight - 10)  + "px";

    //The cover art is a square and shouldn't only take up 3/4's vertially or 1/10 horizontally
    let coverArt = document.getElementById("coverArt");
    coverArt.style.minWidth = Math.min(localStorage.bodyHeight * 0.75, localStorage.bodyWidth * 0.1) + "px";

    let scrubberCell = document.getElementById("scrubberCell");
    scrubberCell.appendChild(scrubber.elt);

    //when the scrubber is being moved, don't attempt to update the value within the time update
    scrubber.onScrubStart = function() {
        stop_draw = true;
    };

    //after the move finishes update the position of the song and re allow drawing
    scrubber.onScrubEnd = function(value) {
        stop_draw = false;
        background.mp3Player.currentTime = background.mp3Player.duration * (value / 100);
    };

    //set the play-pause buttons to their initial state 
    updatePlayPause();
    let playButton = document.getElementById("playButton");
    let pauseButton = document.getElementById("pauseButton");

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
        //after thumbs-up is clicked, send feedback, update image, and disable the button
        background.addFeedback(-1, true);
        if (background.currentSong.songRating === true) {
            stopAllListeners(tUpButton, "click");
            tUpButton.src = "images/thumbUpCheck.png";
        }
    });

    let tDownButton = document.getElementById("tDownButton");
    tDownButton.addEventListener("click", function () {
        //aft thumbs-down is clicked, send feedback and skip the song
        background.addFeedback(-1, false);
        setTimeout(function () {
            background.nextSong();
        }, 1000); // Small delay to stop extension from freezing for some reason
    });

    let sleepButton = document.getElementById("sleepButton");
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

    volume.onScrubEnd = function (value) {
        //when the volume scrubber is adjusted, update the volume
        localStorage.volume = value / 100;
        background.mp3Player.volume = value / 100;
    };

    let nextButton = document.getElementById("nextButton");
    nextButton.addEventListener("click", function () {
        goToStations();
    });

    let stationList = document.getElementById("stationList");
    stationList.addEventListener("change", function () {
        //after selecting a station, start playing and go to the player panel
        background.nextSongStation(stationList.selectedOptions[0].value);
        goToPlayer();
    });

    let unWarning = document.getElementById("unWarning");
    let pwWarning = document.getElementById("pwWarning");
    let rightWarnRow = document.getElementById("rightWarnRow");

    if (background.stationList !== undefined) {
        //if we have a list of stations, add them
        addStations();
    }

    //if not logged in
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
        } else {
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

    let login = document.getElementById("login");
    login.onsubmit = function () {
        //after someone attempts to login, clear any old data
        background.stationList = [];
        background.currentSong = undefined;
        background.currentPlaylist = undefined;

        let username = document.getElementById("username");
        let password = document.getElementById("password");

        localStorage.username = username.value;
        localStorage.password = password.value;
        background.partnerLogin();
        if (background.userAuthToken === "") {
            //if the login was a failure, show some error details
            unWarning.style.display = "block";
            pwWarning.style.display = "block";
            rightWarnRow.style.display = "block";
        } else {
            //if it was a success, show the stations
            addStations();
            goToStations();
        }
        return false;
    };

    if (background.mp3Player.src !== "") {
        if (background.mp3Player.currentTime > 0) {
            //if we are playing music right now, then update the player with the current details
            updatePlayer();
            drawPlayer();
        }
    } else {
        updatePlayer();
    }
});

function pause_audio () {
    /**
     * Pause the audio and update the buttons
     */
    background.mp3Player.pause();
    updatePlayPause();
}

function play_audio () {
    /**
     * Play the audio and update the buttons
     */
    background.play(localStorage.lastStation);
    updatePlayPause();
}

background.setCallbacks(updatePlayer, drawPlayer, downloadSong);