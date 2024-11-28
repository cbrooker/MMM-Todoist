"use strict";

const { unsubscribe } = require("diagnostics_channel");
/* Magic Mirror
 * Module: MMM-Todoist
 *
 * By Chris Brooker, James Brock
 *
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const request = require("request");
const showdown = require("showdown");

const markdown = new showdown.Converter();

module.exports = NodeHelper.create({
	start: function() {
		console.log("Starting node helper for: " + this.name);
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "FETCH_TODOIST") {
			this.config = payload;
			this.fetchTodos();
		}
		if (notification === "ADDITEM_TODOIST") {
			this.config = payload.config;
			this.addData = payload.addData;
			this.fetchTodos(this.addItemToList);
		}
	},

	fetchTodos : function(callback) {
		var self = this;
		//request.debug = true;
		var acessCode = self.config.accessToken;
		request({
			url: self.config.apiBase + "/" + self.config.apiVersion + "/" + self.config.todoistEndpoint + "/",
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				"cache-control": "no-cache",
				"Authorization": "Bearer " + acessCode
			},
			form: {
				sync_token: "*",
				resource_types: self.config.todoistResourceType
			}
		},
		function(error, response, body) {
			if (error) {
				self.sendSocketNotification("FETCH_ERROR", {
					error: error
				});
				return console.error(" ERROR - MMM-Todoist: " + error);
			}
			if(self.config.debug){
				console.log(body);
			}
			if (response.statusCode === 200) {
				var taskJson = JSON.parse(body);
				taskJson.items.forEach((item)=>{
					item.contentHtml = markdown.makeHtml(item.content);
				});

				taskJson.accessToken = acessCode;

				if (callback) {
					callback(self, taskJson);
				} else {
					self.sendSocketNotification("TASKS", taskJson);
				}
			}
			else{
				console.log("Todoist api request status="+response.statusCode);
			}

		});
	},

	findItem: function(taskJson, reqProj, reqTask) {
		var itemid = null;
		taskJson.items.filter(function (item) {
			if (item.project_id == reqProj) {
				if (item.day_order === -1) {
					if (item.due) {
						let duedate = item.due["date"];
						let date = new Date();
						let year = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
						let month = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(date);
						let day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date);
						let today = `${year}-${month}-${day}`;
						if (duedate === today) {
							if (item.content === reqTask) {
								itemid = item.id;
							}
						}
					}
				}
			}
		});
		return itemid;
	},

	// TBD
	addNewSubItemToList: function(self, proj, task, parent) {
		var acessCode = self.config.accessToken;

		const crypto = require('crypto');
		// Create self.addData.message as new item
		var uuid = crypto.randomBytes(16).toString('hex');
		var tmpid = crypto.randomBytes(16).toString('hex');
		var itemid = null;
		request({
			url: self.config.apiBase + "/" + self.config.apiVersion + "/" + self.config.todoistEndpoint + "/",
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				"cache-control": "no-cache",
				"Authorization": "Bearer " + acessCode
			},
			form: {
				commands:"[{ \
							\"type\": \"item_add\", \
							\"temp_id\": \"" + tmpid + "\", \
							\"uuid\": \"" + uuid + "\", \
							\"args\": { \
									\"content\": \"" + task + "\", \
									\"project_id\": \"" + proj + "\", \
									\"parent_id\": \"" + parent + "\" \
							}}]"
			}
		},
		function(error, response, body) {
			if (error) {
				self.sendSocketNotification("ADDNEWSUBITEM_ERROR", {
					error: error
				});
				return console.error(" ERROR - MMM-Todoist: " + error);
			}
			if(self.config.debug){
				console.log(body);
			}
			if (response.statusCode === 200) {
				var taskJson = JSON.parse(body);
				itemid = taskJson["temp_id_mapping"][JSON.stringify(tmpid)];
			}
		});
	},

	// TBD
	addNewItemToList: function(proj, task, callback = null) {
		var self = this;
		var acessCode = self.config.accessToken;

		const crypto = require('crypto');
		// Create self.addData.message as new item
		var uuid = crypto.randomBytes(16).toString('hex');
		var tmpid = crypto.randomBytes(16).toString('hex');
		var itemid = null;

		var proj_str = "";
		if ((proj != "inbox")) {
			proj_str = "\"project_id\": \"" + proj + "\",";
		}

		request({
			url: self.config.apiBase + "/" + self.config.apiVersion + "/" + self.config.todoistEndpoint + "/",
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				"cache-control": "no-cache",
				"Authorization": "Bearer " + acessCode
			},
			form: {
				commands:"[{ \
							\"type\": \"item_add\", \
							\"temp_id\": \"" + tmpid + "\", \
							\"uuid\": \"" + uuid + "\", \
							\"args\": { \
									\"content\": \"" + task + "\"," + proj_str +
									"\"due\": {\"string\":\"today\"} \
							}}]"
			}
		},
		function(error, response, body) {
			if (error) {
				self.sendSocketNotification("ADDNEWITEM_ERROR", {
					error: error
				});
				return console.error(" ERROR - MMM-Todoist: " + error);
			}
			if(self.config.debug){
				console.log(body);
			}
			if (response.statusCode === 200) {
				var taskJson = JSON.parse(body);
				itemid = taskJson["temp_id_mapping"][tmpid];
				if (callback) {
					callback(self, proj, self.addData.message, itemid);
				}
			}
		});
	},

	addItemToList: function(self, taskJson) {
		if (taskJson == undefined) {
			return;
		}
		if (taskJson.accessToken != self.config.accessToken) {
			return;
		}
		if (taskJson.items == undefined) {
			return;
		}

		const crypto = require('crypto');
		var reqProj = self.addData.data["id"].split("-")[0];
		var reqTask = self.addData.data["id"].split("-")[1];

		// If we're making a new item, make it
		if (reqTask == "NEW") {
			self.addNewItemToList(reqProj, self.addData.message);
		} else { // add a sub-item to an item
			var tmpid = null;
			var itemid = null;
			itemid = self.findItem(taskJson, reqProj, reqTask);

			// If parent item not found, add it
			if (itemid == null) {
				// Create self.addData.data["task"] as new item (get itemid)
				self.addNewItemToList(reqProj, reqTask, self.addNewSubItemToList);
			} else {
				// ADD self.addData.message as sub-item to itemid
				self.addNewSubItemToList(self, reqProj, self.addData.message, itemid);
			}
		}

		self.sendSocketNotification("ADDITEM", itemid);
	}
});