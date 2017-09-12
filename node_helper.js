"use strict";

/* Magic Mirror
 * Module: MMM-Todoist
 *
 * By Chris Brooker
 * 		Adapted from MMM-Wonderlist by Paul-Vincent Roll http://paulvincentroll.com
 * 
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
var request = require("request");
const Fetcher = require("./fetcher.js");

module.exports = NodeHelper.create({
    start: function() {
        this.config = [];
        this.fetchers = {};
    },

    // Override socketNotificationReceived method.
    socketNotificationReceived: function(notification, payload) {
        if (notification === "ADD_TODOIST_PROJECTS") {
            console.log("ADD_TODOIST_PROJECTS: " + payload.projects);
            this.createFetcher(payload.url, payload.fetchInterval, payload.excludedEvents, payload.maximumEntries, payload.maximumNumberOfDays, payload.auth);
        }
    },










    createFetcher: function(projects, reloadInterval) {
        var self = this;

        var fetcher;
        if (typeof this.fetcher === "undefined") {
            console.log("Create new Todoist fetcher for Projects: " + projects);
            fetcher = new Fetcher(projects, reloadInterval, this.config.accessToken);
            fetcher.onReceive(function(fetcher) {
                self.broadcastTodos();
            });

            fetcher.onError(function(fetcher, error) {
                self.sendSocketNotification("FETCH_ERROR", {
                    url: fetcher.id(),
                    error: error
                });
            });

            this.fetcher = {
                "instance": fetcher
            };
        } else {
            console.log("Use exsisting todo fetcher for list: " + projects);
            fetcher = this.fetcher.instance;
            fetcher.setReloadInterval(reloadInterval);
            fetcher.broadcastItems();
        }
        fetcher.startFetch();
    },

    broadcastTodos: function() {
        if (typeof this.fetcher !== "undefined") {
            this.sendSocketNotification("TASKS", this.fetcher.instance.todostResp());
        }

    },

    // Subclass socketNotificationReceived received.
    socketNotificationReceived: function(notification, payload) {
        const self = this;

        //CONFIG Receiver (payload contains this.config)
        if (notification === "CONFIG" && this.started == false) {
            this.config.interval = payload.interval;
            this.config.accessToken = payload.accessToken;
            this.config.clientID = payload.clientID;
            self.sendSocketNotification("STARTED");
            self.started = true;
        } else if (notification === "addLists") {
            //(payload contains this.config)
            //createFetcher(projects, reloadInterval, accessToken)
            self.createFetcher(payload.projects, payload.interval * 1000);

        } else if (notification === "CONNECTED") {
            this.broadcastTodos();
        }
    }

});