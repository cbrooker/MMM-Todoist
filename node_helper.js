"use strict";

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
		if (notification === "COMPLETE_TODOIST") {
			this.config = payload.config;
			this.completeTask(payload.taskId);
		}
	},

	fetchTodos : function(callback) {
		var self = this;
		//request.debug = true;
		var accessCode = self.config.accessToken;
		request({
			url: self.config.apiBase + "/" + self.config.apiVersion + "/" + self.config.todoistEndpoint + "/",
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				"cache-control": "no-cache",
				"Authorization": "Bearer " + accessCode
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

				taskJson.accessToken = accessCode;

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
			if (item.project_id === reqProj) {
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
	addNewSubItemToList: function(self, proj, task, parent, section = null) {
		var accessCode = self.config.accessToken;

		const crypto = require('crypto');
		// Create self.addData.message as new item
		var uuid = crypto.randomBytes(16).toString('hex');
		var tmpid = crypto.randomBytes(16).toString('hex');
		var itemid = null;

		// Build section parameter if provided
		var section_str = "";
		if (section) {
			section_str = ", \"section_id\": \"" + section + "\"";
		}

		request({
			url: self.config.apiBase + "/" + self.config.apiVersion + "/" + self.config.todoistEndpoint + "/",
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				"cache-control": "no-cache",
				"Authorization": "Bearer " + accessCode
			},
			form: {
				commands:"[{ \
							\"type\": \"item_add\", \
							\"temp_id\": \"" + tmpid + "\", \
							\"uuid\": \"" + uuid + "\", \
							\"args\": { \
									\"content\": \"" + task + "\", \
									\"project_id\": \"" + proj + "\", \
									\"parent_id\": \"" + parent + "\"" + section_str + " \
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
				// Send ADDITEM only after API confirms subtask was created
				self.sendSocketNotification("ADDITEM", itemid);
			}
		});
	},

	// TBD
	addNewItemToList: function(proj, task, callback = null, section = null) {
		var self = this;
		var accessCode = self.config.accessToken;

		const crypto = require('crypto');
		// Create self.addData.message as new item
		var uuid = crypto.randomBytes(16).toString('hex');
		var tmpid = crypto.randomBytes(16).toString('hex');
		var itemid = null;

		var proj_str = "";
		if ((proj !== "inbox")) {
			proj_str = "\"project_id\": \"" + proj + "\"";
		}

		var section_str = "";
		if (section) {
			section_str = "\"section_id\": \"" + section + "\"";
		}

		request({
			url: self.config.apiBase + "/" + self.config.apiVersion + "/" + self.config.todoistEndpoint + "/",
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				"cache-control": "no-cache",
				"Authorization": "Bearer " + accessCode
			},
			form: {
				commands:"[{ \
							\"type\": \"item_add\", \
							\"temp_id\": \"" + tmpid + "\", \
							\"uuid\": \"" + uuid + "\", \
							\"args\": { \
									\"content\": \"" + task + "\"," +
									"\"due\": {\"string\":\"today\"}" +
									(proj_str ? "," + proj_str : "") +
									(section_str ? "," + section_str : "") + " \
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
					callback(self, proj, self.addData.message, itemid, section);
				} else {
					// Send ADDITEM only after API confirms task was created
					self.sendSocketNotification("ADDITEM", itemid);
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
		var idParts = self.addData.data["id"].split("-");
		var reqProj = idParts[0];
		var reqTask = idParts[1];
		var reqSection = idParts[2] || null; // Optional section ID

		// If we're making a new item, make it
		if (reqTask === "NEW") {
			self.addNewItemToList(reqProj, self.addData.message, null, reqSection);
		} else { // add a sub-item to an item
			var tmpid = null;
			var itemid = null;
			itemid = self.findItem(taskJson, reqProj, reqTask);

			// If parent item not found, add it
			if (itemid == null) {
				// Create self.addData.data["task"] as new item (get itemid)
				self.addNewItemToList(reqProj, reqTask, self.addNewSubItemToList, reqSection);
			} else {
				// ADD self.addData.message as sub-item to itemid
				self.addNewSubItemToList(self, reqProj, self.addData.message, itemid, reqSection);
			}
		}
		// Note: ADDITEM notification is now sent from the API response callbacks
		// in addNewItemToList() and addNewSubItemToList() to ensure task exists
	},

	/**
	 * Completes a task via Todoist Sync API with retry logic
	 * @param {string} taskId - The ID of the task to complete
	 * @param {number} attempt - Current attempt number (default 1)
	 * @param {number} maxRetries - Maximum number of retry attempts (default 3)
	 */
	completeTask: function(taskId, attempt, maxRetries) {
		var self = this;
		attempt = attempt || 1;
		maxRetries = maxRetries || 3;
		var accessCode = self.config.accessToken;

		const crypto = require('crypto');
		var uuid = crypto.randomBytes(16).toString('hex');

		if (self.config.debug) {
			console.log("MMM-Todoist: Attempting to complete task " + taskId + " (attempt " + attempt + "/" + maxRetries + ")");
		}

		request({
			url: self.config.apiBase + "/" + self.config.apiVersion + "/" + self.config.todoistEndpoint + "/",
			method: "POST",
			timeout: 15000, // 15 second timeout per request
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				"cache-control": "no-cache",
				"Authorization": "Bearer " + accessCode
			},
			form: {
				commands: JSON.stringify([{
					"type": "item_close",
					"uuid": uuid,
					"args": {
						"id": taskId
					}
				}])
			}
		},
		function(error, response, body) {
			if (error) {
				console.error("ERROR - MMM-Todoist: Task completion failed (attempt " + attempt + "): " + error);
				
				// Retry on network errors
				if (attempt < maxRetries) {
					var delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
					console.log("MMM-Todoist: Retrying in " + (delay/1000) + " seconds...");
					setTimeout(function() {
						self.completeTask(taskId, attempt + 1, maxRetries);
					}, delay);
				} else {
					self.sendSocketNotification("COMPLETE_ERROR", {
						error: "Network error after " + maxRetries + " attempts: " + error.message
					});
				}
				return;
			}

			if (self.config.debug) {
				console.log("Task completion response: " + body);
			}

			if (response.statusCode === 200) {
				var responseJson;
				try {
					responseJson = JSON.parse(body);
				} catch (parseError) {
					console.error("ERROR - MMM-Todoist: Failed to parse completion response: " + parseError);
					self.sendSocketNotification("COMPLETE_ERROR", {
						error: "Invalid response from server"
					});
					return;
				}
				
				// Check sync_status for command result
				if (responseJson.sync_status && responseJson.sync_status[uuid] === "ok") {
					self.sendSocketNotification("TASK_COMPLETED", {
						taskId: taskId
					});
				} else {
					// Command failed but got a response - don't retry, report error
					self.sendSocketNotification("COMPLETE_ERROR", {
						error: "Task completion command failed",
						details: responseJson.sync_status
					});
				}
			} else if (response.statusCode >= 500 && attempt < maxRetries) {
				// Server error - retry with backoff
				console.log("MMM-Todoist: Server error " + response.statusCode + " (attempt " + attempt + ")");
				var delay = Math.pow(2, attempt) * 1000;
				console.log("MMM-Todoist: Retrying in " + (delay/1000) + " seconds...");
				setTimeout(function() {
					self.completeTask(taskId, attempt + 1, maxRetries);
				}, delay);
			} else {
				self.sendSocketNotification("COMPLETE_ERROR", {
					error: "HTTP " + response.statusCode
				});
				console.log("Todoist completion request status=" + response.statusCode);
			}
		});
	}
});