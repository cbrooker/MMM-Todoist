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
	this.started = false;
 },

 getLists: function(callback) {
	request({
		url: "https://todoist.com/API/v7/sync/",
		method: "POST",
		headers: { 
			'content-type': 'application/x-www-form-urlencoded',
			'cache-control': 'no-cache' 
		},
		form: { 
				token: this.config.accessToken,
				sync_token: '*',
				resource_types: '["items"]' 
		}
	 }, function(error, response, body) {
	 if (!error && response.statusCode == 200) {
		var lists = {};
		for (var i = 0; i < JSON.parse(body).items.length; i++) {
			lists[JSON.parse(body).items[i].content] = {
				id: JSON.parse(body).items[i].id
			};
		}
		callback(lists);
	 }
	});
 },

 createFetcher: function(listID, list, reloadInterval) {
	var self = this;

	var fetcher;
	if (typeof this.fetchers[listID] === "undefined") {
	 console.log("Create new todo fetcher for list: " + list + " - Interval: " + reloadInterval);
	 fetcher = new Fetcher(listID, reloadInterval, this.config.accessToken, this.config.clientID);

	 fetcher.onReceive(function(fetcher) {
		self.broadcastTodos();
	 });

	 fetcher.onError(function(fetcher, error) {
		self.sendSocketNotification("FETCH_ERROR", {
		 url: fetcher.id(),
		 error: error
		});
	 });

	 this.fetchers[listID] = {
		"name": list,
		"instance": fetcher
	 };
	} else {
	 console.log("Use exsisting todo fetcher for list: " + list);
	 fetcher = this.fetchers[listID].instance;
	 fetcher.setReloadInterval(reloadInterval);
	 fetcher.broadcastItems();
	}

	fetcher.startFetch();
 },

 broadcastTodos: function() {
	var todos = {};
	for (var f in this.fetchers) {
	 todos[this.fetchers[f].name] = this.fetchers[f].instance.items();
	}
	this.sendSocketNotification("TASKS", todos);
 },

 // Subclass socketNotificationReceived received.
 socketNotificationReceived: function(notification, payload) {
	if (notification === "CONFIG" && this.started == false) {
	 const self = this
	 this.config.interval = payload.interval
	 this.config.accessToken = payload.accessToken;
	 this.config.clientID = payload.clientID;
	 this.getLists(function(data) {
		self.lists = data
		self.sendSocketNotification("STARTED")
	 });
	 self.started = true
	} else if (notification === "addLists") {
	 
	 for (var i in payload) {
		 //console.log(payload[i])
		//this.createFetcher(this.lists[payload[i]], payload[i], this.config.interval * 1000);
		this.createFetcher(payload[i], payload[i], this.config.interval * 1000);
	 }
	} else if (notification === "CONNECTED") {
	 this.broadcastTodos()
	}
 }

});