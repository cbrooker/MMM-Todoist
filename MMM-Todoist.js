/* global Module */

/* Magic Mirror
 * Module: MMM-Todoist
 *
 * By Chris Brooker
 * 
 * 		Adapted from MMM-Wonderlist by Paul-Vincent Roll http://paulvincentroll.com
 * 
 * MIT Licensed.
 */

Module.register("MMM-Todoist", {

    defaults: {
        maximumEntries: 10,
        lists: ["inbox"],
        interval: 60,
        fade: true,
        fadePoint: 0.25,
        sortByDate: false
    },

    // Define required scripts.
    getStyles: function() {
        return ["MMM-Todoist.css"];
    },

    // Override socket notification handler.
    socketNotificationReceived: function(notification, payload) {
        if (notification === "TASKS") {
            this.tasks = payload
            this.updateDom(3000);
        } else if (notification === "STARTED") {
            console.log(notification);
            this.sendSocketNotification("addLists", this.config.lists);
        }
    },

    start: function() {
        this.tasks = [];
        this.sendSocketNotification("CONFIG", this.config);
        this.sendSocketNotification("CONNECTED");
        Log.info("Starting module: " + this.name);
    },

    getTodos: function() {
        var tasksShown = [];

        for (var i = 0; i < this.config.lists.length; i++) {
            if (typeof this.tasks[this.config.lists[i]] != "undefined") {
                var list = this.tasks[this.config.lists[i]];

                for (var todo in list) {
                    tasksShown.push(list[todo]);

                }
            }
        }
        return tasksShown.slice(0, this.config.maximumEntries);

    },
    treatAsUTC: function(date) {
        var result = new Date(date);
        result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
        return result;
    },
    getDom: function() {
        var table = document.createElement("table");
        table.className = "normal small light";

        var todos = this.getTodos();

        for (var i = 0; i < todos.length; i++) {
            var row = document.createElement("tr");
            table.appendChild(row);

            var priorityCell = document.createElement("td");
            switch (todos[i].priority) {
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
            todoCell.innerHTML = todos[i].content;
            row.appendChild(todoCell);

            var dueDateCell = document.createElement("td");
            dueDateCell.className = "bright ";

            var oneDay = 24 * 60 * 60 * 1000;
            var dueDate = new Date(todos[i].due_date_utc);
            var diffDays = Math.floor((dueDate - new Date()) / (oneDay));
            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            switch (diffDays) {
                case -1:
                    dueDateCell.innerHTML = "Yesterday";
                    dueDateCell.className += "xsmall overdue";
                    break;
                case 0:
                    dueDateCell.innerHTML = "Today";
                    dueDateCell.className += "today";
                    break;
                case 1:
                    dueDateCell.innerHTML = "Tomorrow";
                    dueDateCell.className += "xsmall tomorrow";
                    break;
            }

            if (dueDateCell.innerHTML == "") {
                dueDateCell.innerHTML = months[dueDate.getMonth()] + ' ' + dueDate.getDate();
                if (diffDays < -1) {
                    dueDateCell.className += "xsmall overdue";
                }
                if (diffDays > 1000) {
                    dueDateCell.innerHTML = "";
                }
            }

            row.appendChild(dueDateCell);


            // Create fade effect by MichMich (MIT)
            if (this.config.fade && this.config.fadePoint < 1) {
                if (this.config.fadePoint < 0) {
                    this.config.fadePoint = 0;
                }
                var startingPoint = todos.length * this.config.fadePoint;
                var steps = todos.length - startingPoint;
                if (i >= startingPoint) {
                    var currentStep = i - startingPoint;
                    table.style.opacity = 1 - (1 / steps * currentStep);
                }
            }
            // End Create fade effect by MichMich (MIT)
        }

        return table;
    }

});