/*global partnerLogin, getPlaylist, currentPlaylist, platform_specific, get_browser, is_android*/
/*exported setCallbacks, play, downloadSong, nextSongStation*/

var callback;
var currentSong;
var comingSong;
var prevSongs = [];
var mp3Player;

//callbacks for messaging between the popup and background pages
function setCallbacks(updatePlayer,drawPlayer,downloadSong){
    callback = {
        "updatePlayer": updatePlayer,
        "drawPlayer": drawPlayer,
        "downloadSong": downloadSong
    };
}

function play(stationToken) {
    /**
     * fetch and play songs from the provided station
     */
    if (stationToken !== localStorage.lastStation) {
        currentSong = undefined;
        getPlaylist(stationToken);
        localStorage.lastStation = stationToken;
        nextSong();
    } else {
        if (currentSong === undefined) {
            getPlaylist(localStorage.lastStation);
        }
        if (mp3Player.currentTime > 0) {
            mp3Player.play();
        } else {
            nextSong();
        }
    }
}

function nextSongStation(station) {
    /**
     * Play the next song on a given station
     */
    localStorage.lastStation = station;
    getPlaylist(localStorage.lastStation);
    comingSong = undefined;
    nextSong();
}

function nextSong(depth=1) {
    /**
     * Play the next song on the current station
     */
    if (depth > 4){
        // console.log("What? We recursed down 4 times?");
        //this recurses on failures to fetch "new" next songs
        return;
    }
    //if we don't have anythign to play, get more
    if (currentPlaylist === undefined || currentPlaylist.length === 0) {
        getPlaylist(localStorage.lastStation);
    }
    if (comingSong === undefined) {
        comingSong = currentPlaylist.shift();
    }
    currentSong = comingSong;

    //in case the most recent shift emptied the playlist
    if (currentPlaylist.length === 0) {
        getPlaylist(localStorage.lastStation);
    }
    comingSong = currentPlaylist.shift();

    //get the url
    let song_url;
    if (currentSong.additionalAudioUrl != null) {
        song_url = currentSong.additionalAudioUrl;
    } else {
        song_url = currentSong.audioUrlMap.highQuality.audioUrl;
    }

    //and play the song
    mp3Player.setAttribute("src", song_url);
    mp3Player.play();

    // this XHR exists to test if the song which we are "playing" actually loaded or not.
    // it makes a HEAD request, if that fails, it calls nextSong again
    let xhr = new XMLHttpRequest();
    xhr.open("HEAD", song_url, true);

    xhr.addEventListener("error", function() {
        //if the HEAD fails then get a new song
        nextSong(depth + 1);
    });

    xhr.addEventListener("load", function() {
        //if the HEAD succeeds then the song can be loaded properly
        if (xhr.status >= 300){
            //if the HEAD fails then get a new song
            nextSong(depth + 1);
        }
    });

    xhr.send();
}

function downloadSong() {
    /**
     * Fetch the requisite URL for downloading a song
     */
    var url = "";
    if (currentSong.additionalAudioUrl != null) {
        url = currentSong.additionalAudioUrl;
    } else {
        url = currentSong.audioUrlMap.highQuality.audioUrl;
    }
    callback.downloadSong(url, currentSong.songName);
}

if (localStorage.username !== "" && localStorage.password !== "") {
    partnerLogin();
}

function setup_commands() {
    /**
     * Setup hotkeys, Android cannot handle this, so it is excluded
     */
    if (!is_android()) {
        get_browser().commands.onCommand.addListener(function(command) {
            if (command === "pause_play") {
                if (!mp3Player.paused) {
                    mp3Player.pause();
                } else {
                    play(localStorage.lastStation);
                }
            } else if(command === "skip_song") {
                nextSong();
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    //load mp3Player stored volume if possible
    mp3Player = document.getElementById("mp3Player");
    if (localStorage.volume) {
        mp3Player.volume = localStorage.volume;
    } else {
        //if not, don't deafen anyone
        mp3Player.volume = 0.1;
    }

    //do platform specific (non-chrome) stuff
    platform_specific(get_browser());
    setup_commands();

    mp3Player.addEventListener("play", function () {
        //whenever the mp3Player is "played"
        try {
            //check if the window exists
            String(mp3Player);
            callback.updatePlayer();
            currentSong.startTime = Math.round(new Date().getTime() / 1000);
        } catch (e) {
            //if it doesn"t exist, don"t draw here
            return;
        }
    });
    mp3Player.addEventListener("ended", function () {
        //whenever a song ends, if it was good, put it in the history
        //and play the next song
        if (currentSong.songRating != "1") {
            prevSongs.push(currentSong);
            //console.log("History Num = "+localStorage.historyNum);
            while(prevSongs.length > localStorage.historyNum){
                prevSongs.shift();
            }
        }
        nextSong();
    });
    //whenever the time changes, re-draw
    mp3Player.addEventListener("timeupdate", function () {
        try {
            //check if the window exists
            String(mp3Player);
            callback.drawPlayer();
        } catch(e){
            //if it doesn"t, don"t draw here
            return;
        }
    });
    
    mp3Player.addEventListener("error", function () {
        //console.log(err);
        //if (errorCount > 3) {
        //  alert("There seems to be an issue with Anesidora. To prevent Pandora account lockout Anesidora has been stopped.");
        //  return;
        //}
    });
});