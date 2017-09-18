"use strict";

/* Magic Mirror
 * Module: MMM-Todoist
 *
 * By Chris Brooker
 * 
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
var request = require("request");
const Fetcher = require("./fetcher.js");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting module: " + this.name);
        this.config = [];
        this.fetchers = [];
    },

    // Override socketNotificationReceived method.
    socketNotificationReceived: function(notification, payload) {
        if (notification === "START_TODOIST") {
            this.createFetcher(payload); //Payload is the config.
        }
    },

    createFetcher: function(config) {
        var self = this;

        var fetcher;
        if (typeof this.fetcher === "undefined") {
            // console.log("Create new Todoist fetcher");
            fetcher = new Fetcher(config);
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
            // console.log("Use exsisting Todoist fetcher for list");
            fetcher = this.fetcher.instance;
            fetcher.setReloadInterval(config.updateInterval);
            fetcher.broadcastItems();
        }
        fetcher.startFetch();
    },

    broadcastTodos: function() {
        if (typeof this.fetcher !== "undefined") {
            this.sendSocketNotification("TASKS", this.fetcher.instance.todostResponse());
        }

    }

    // // Subclass socketNotificationReceived received.
    // socketNotificationReceived: function(notification, payload) {
    //     const self = this;

    //     //CONFIG Receiver (payload contains this.config)
    //     if (notification === "CONFIG" && this.started == false) {
    //         this.config = payload;
    //         self.sendSocketNotification("STARTED");
    //         self.started = true;
    //     } else if (notification === "addLists") {
    //         //(payload contains this.config)
    //         //createFetcher(projects, reloadInterval, accessToken)
    //         self.createFetcher(payload.projects, payload.interval * 1000);

    //     } else if (notification === "CONNECTED") {
    //         this.broadcastTodos();
    //     }
    // }

});