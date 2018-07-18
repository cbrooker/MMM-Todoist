/* global Module */

/* Magic Mirror
 * Module: MMM-Todoist
 *
 * By Chris Brooker
 *
 * MIT Licensed.
 */

Module.register("MMM-Todoist", {

	defaults: {
		maximumEntries: 10,
		projects: ["inbox"],
		updateInterval: 10 * 60 * 1000, // every 10 minutes,
		fade: true,
		fadePoint: 0.25,
		sortType: "todoist",
		showProject: true,
		projectColors: ["#95ef63", "#ff8581", "#ffc471", "#f9ec75", "#a8c8e4", "#d2b8a3", "#e2a8e4", "#cccccc", "#fb886e",
			"#ffcc00", "#74e8d3", "#3bd5fb", "#dc4fad", "#ac193d", "#d24726", "#82ba00", "#03b3b2", "#008299",
			"#5db2ff", "#0072c6", "#000000", "#777777"
		], //These colors come from Todoist and their order matters if you want the colors to match your Todoist project colors.

		//This has been designed to use the Todoist Sync API.
		apiVersion: "v7",
		apiBase: "https://todoist.com/api",
		todoistEndpoint: "sync",
		todoistResourceType: "[\"items\", \"projects\"]"
	},

	// Define required scripts.
	getStyles: function() {
		return ["MMM-Todoist.css"];
	},
	getTranslations: function() {
		return {
			en: "translations/en.json",
			de: "translations/de.json"
		};
	},

	start: function() {
		var self = this;
		Log.info("Starting module: " + this.name);

		if (this.config.accessToken === "") {
			Log.error("MMM-Todoist: AccessToken not set!");
			return;
		}

		//Support legacy properties
		if (this.config.lists !== undefined) {
			if (this.config.lists.length > 0) {
				this.config.projects = this.config.lists;
			}
		}

		this.sendSocketNotification("FETCH_TODOIST", this.config);

		setInterval(function () {
			self.sendSocketNotification("FETCH_TODOIST", self.config);
		}, this.config.updateInterval);
	},


	// Override socket notification handler.
	socketNotificationReceived: function(notification, payload) {
		if (notification === "TASKS") {
			this.filterTodoistData(payload);
			this.updateDom(1000);
		}else if (notification === "FETCH_ERROR") {
			Log.error("Todoist Error. Could not fetch todos: " + payload.error);
		}
	},

	filterTodoistData: function(tasks){
		var self = this;
		var items = [];

		if (tasks != undefined) {
			if (tasks.items != undefined) {

				//Filter the Todos by the Projects specified in the Config
				tasks.items.forEach(function(item) {
					self.config.projects.forEach(function(project) {
						if (item.project_id == project) {
							items.push(item);
						}
					});
				});

				//Used for ordering by date
				items.forEach(function(item) {
					if (item.due_date_utc === null) {
						item.due_date_utc = "Fri 31 Dec 2100 23:59:59 +0000";
						item.all_day = true;
					}
					//Not used right now
					item.ISOString = new Date(item.due_date_utc.substring(4, 15).concat(item.due_date_utc.substring(15, 23))).toISOString();
				});


				//***** Sorting code if you want to add new methods. */
				switch (self.config.sortType) {
				case "todoist":
					sorteditems = self.sortByTodoist(items);
					break;
				case "dueDateAsc":
					sorteditems = self.sortByDueDateAsc(items);
					break;
				case "dueDateDesc":
					sorteditems = self.sortByDueDateDesc(items);
					break;
				default:
					sorteditems = self.sortByTodoist(items);
					break;
				}

				//Slice by max Entries
				items = items.slice(0, this.config.maximumEntries);

				this.tasks =  {"items" : items, "projects" : tasks.projects};
			}
		}
	},
	sortByTodoist: function(itemstoSort) {
		itemstoSort.sort(function(a, b) {
			var itemA = a.item_order,
				itemB = b.item_order;
			return itemA - itemB;
		});
		return itemstoSort;
	},
	sortByDueDateAsc: function(itemstoSort) {
		itemstoSort.sort(function(a, b) {
			var dateA = new Date(a.ISOString),
	        dateB = new Date(b.ISOString);
    	    return dateA - dateB;
		});
		return itemstoSort;
	},
	sortByDueDateDesc: function(itemstoSort) {
		itemstoSort.sort(function(a, b) {
			var dateA = new Date(a.ISOString),
	        dateB = new Date(b.ISOString);
    	    return dateB - dateA;
		});
		return itemstoSort;
	},


	getDom: function() {
		var table = document.createElement("table");
		table.className = "normal small light";


		if (this.tasks === undefined) {
			return table;
		}

		for (var i = 0; i < this.tasks.items.length; i++) {
			var item = this.tasks.items[i];
			var row = document.createElement("tr");
			table.appendChild(row);

			var priorityCell = document.createElement("td");
			switch (item.priority) {
			case 4:
				priorityCell.className = "priority priority1";
				break;
			case 3:
				priorityCell.className = "priority priority2";
				break;
			case 2:
				priorityCell.className = "priority priority3";
				break;
			}
			priorityCell.innerHTML = "";
			row.appendChild(priorityCell);

			var spacerCell = document.createElement("td");
			spacerCell.className = "spacerCell";
			spacerCell.innerHTML = "";
			row.appendChild(spacerCell);

			var todoCell = document.createElement("td");
			todoCell.className = "title bright alignLeft";
			todoCell.innerHTML = item.content;
			row.appendChild(todoCell);

			var dueDateCell = document.createElement("td");
			dueDateCell.className = "bright align-right dueDate ";

			var oneDay = 24 * 60 * 60 * 1000;
			var dueDateTime = new Date(item.due_date_utc);
			var dueDate = new Date(dueDateTime.getFullYear(), dueDateTime.getMonth(), dueDateTime.getDate());
			var now = new Date();
			var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			var diffDays = Math.floor((dueDate - today + 7200000) / (oneDay));
			var diffMonths = (dueDate.getFullYear() * 12 + dueDate.getMonth()) - (now.getFullYear() * 12 + now.getMonth());

			if (diffDays < -1) {
				dueDateCell.innerHTML = dueDate.toLocaleDateString(config.language, {"month": "short"}) + " " + dueDate.getDate();
				dueDateCell.className += "xsmall overdue";
			} else if (diffDays === -1) {
				dueDateCell.innerHTML = this.translate("YESTERDAY");
				dueDateCell.className += "xsmall overdue";
			} else if (diffDays === 0) {
				dueDateCell.innerHTML = this.translate("TODAY");
				if (item.all_day || dueDateTime >= now) {
					dueDateCell.className += "today";
				} else {
					dueDateCell.className += "overdue";
				}
			} else if (diffDays === 1) {
				dueDateCell.innerHTML = this.translate("TOMORROW");
				dueDateCell.className += "xsmall tomorrow";
			} else if (diffDays < 7) {
				dueDateCell.innerHTML = dueDate.toLocaleDateString(config.language, {"weekday": "short"});
				dueDateCell.className += "xsmall";
			} else if (diffMonths < 7 || dueDate.getFullYear() == now.getFullYear()) {
				dueDateCell.innerHTML = dueDate.toLocaleDateString(config.language, {"month": "short"}) + " " + dueDate.getDate();
				dueDateCell.className += "xsmall";
			} else {
				dueDateCell.innerHTML = dueDate.toLocaleDateString(config.language, {"month": "short"}) + " " + dueDate.getDate() + " " + dueDate.getFullYear();
				dueDateCell.className += "xsmall";
			}

			if (dueDateCell.innerHTML !== "" && !item.all_day) {
				function formatTime(d) {
					function z(n) {
						return (n < 10 ? "0" : "") + n;
					}
					var h = d.getHours();
					var m = z(d.getMinutes());
					if (config.timeFormat == 12) {
						return " " + (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM");
					} else {
						return " " + h + ":" + m;
					}
				}
				dueDateCell.innerHTML += formatTime(dueDateTime);
			}
			row.appendChild(dueDateCell);

			//ShowProject
			if (this.config.showProject) {
				var spacerCell2 = document.createElement("td");
				spacerCell2.className = "spacerCell";
				spacerCell2.innerHTML = "";
				row.appendChild(spacerCell2);

				var project = this.tasks.projects.find(p => p.id === item.project_id);
				var projectcolor = this.config.projectColors[project.color];
				var projectCell = document.createElement("td");
				projectCell.className = "xsmall";
				projectCell.innerHTML = project.name + "<span class='projectcolor' style='color: " + projectcolor + "; background-color: " + projectcolor + "'></span>";
				row.appendChild(projectCell);
			}

			// Create fade effect by MichMich (MIT)
			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
					this.config.fadePoint = 0;
				}
				var startingPoint = this.tasks.items.length * this.config.fadePoint;
				var steps = this.tasks.items.length - startingPoint;
				if (i >= startingPoint) {
					var currentStep = i - startingPoint;
					row.style.opacity = 1 - (1 / steps * currentStep);
				}
			}
			// End Create fade effect by MichMich (MIT)
		}

		return table;
	}

});