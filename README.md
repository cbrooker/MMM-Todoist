# MMM-Todoist
This an extension for the [MagicMirror](https://github.com/MichMich/MagicMirror). It can display your Todoist todos. You can add multiple instances with different lists. Only one account supported.

## Installation
1. Navigate into your MagicMirror's `modules` folder and execute `git clone https://github.com/cbrooker/MMM-Todoist.git`. A new folder will appear navigate into it.
2. Execute `npm install` to install the node dependencies.

## Using the module

To use this module, add it to the modules array in the `config/config.js` file:
````javascript
modules: [
	{
		module: 'MMM-Todoist',
		position: 'top_right',	// This can be any of the regions. Best results in left or right regions.
		header: 'Todoist', // This is optional
		config: { // See 'Configuration options' for more information.
          	accessToken: 'accessToken from Todoist',
			maximumEntries: 60,
			updateInterval: 10*60*1000, // Update every 10 minutes
			projects: [ 166564794 ],
			fade: false
      }
	}
]
````

## Configuration options

The following properties can be configured:


<table width="100%">
	<!-- why, markdown... -->
	<thead>
		<tr>
			<th>Option</th>
			<th width="100%">Description</th>
		</tr>
	<thead>
	<tbody>
		<tr>
			<td><code>accessToken</code></td>
			<td>Your Todoist access token, you can get it <a href="https://developer.todoist.com/appconsole.html">here</a>.<br>
				<br><b>Possible values:</b> <code>string</code>
				<br><b>Default value:</b> <code>none</code>
			</td>
		</tr>
		<tr>
			<td><code>projects</code></td>
			<td>
				Array of ProjectIDs you want to display. <br>
				<br><b>Possible values:</b> <code>array</code>
				<br><b>Default value:</b> <code>[ ]</code>
				<br><b>Example:</b> <code>[166564794, 166564792]</code>
				<br>
				<br>
				<b>Getting the Todoist ProjectID:</b><br>
				1) Go to Todoist (Log in if you aren't)<br>
				2) Click on a Project in the left menu<br>
				3) Your browser URL will change to something like<br> <code>"https://todoist.com/app?lang=en&v=818#project%2F166564897"</code><br><br>
				Everything after %2F is the Project ID. In this case "166564897"
			</td>
		</tr>
		<tr>
			<td><code>maximumEntries</code></td>
			<td>Maximum number of todos to be shown.<br>
				<br><b>Possible values:</b> <code>int</code>
				<br><b>Default value:</b> <code>10</code>
			</td>
		</tr>
		<tr>
			<td><code>interval</code></td>
			<td>How often the module should load new todos. Be careful, this is in ms, NOT seconds! So, too low a number will lock you out for repeated server attempts!<br>
				<br><b>Possible values:</b> <code>int</code> in <code>milliseconds</code>
				<br><b>Default value:</b> <code>10*60*1000</code>
			</td>
		</tr>
		<tr>
			<td><code>fade</code></td>
			<td>Fade todos to black. (Gradient)<br>
				<br><b>Possible values:</b> <code>true</code> or <code>false</code>
				<br><b>Default value:</b> <code>true</code>
			</td>
		</tr>
		<tr>
			<td><code>fadePoint</code></td>
			<td>Where to start fade?<br>
				<br><b>Possible values:</b> <code>0</code> (top of the list) - <code>1</code> (bottom of list)
				<br><b>Default value:</b> <code>0.25</code>
			</td>
		</tr>
		<tr>
			<td><code>showProject</code></td>
			<td>If true this will display the Project to the right of the DueDates as it does on Todost.<br>
				<br><b>Possible values:</b> <code>boolean</code>
				<br><b>Default value:</b> <code>true</code>
			</td>
		</tr>
		<tr>
			<td><code>sortType</code></td>
			<td>This will determine the sorting method used when displaying your Todos.<br>
				<br><b>Possible values:</b> <br />
				<code>"todoist"</code> <span>- Sort based on the order in Todoist.</span> </br >
				<code>"dueDateAsc"</code> <span>- Sort based on the Due Date of the Todo Ascending. (Oldest date first)</span> </br>
				<code>"dueDateDesc"</code> <span>- Sort based on the Due Date of the Todo Descending. (Newest date first)</span></br>
				<br><b>Default value:</b> <code>"todoist"</code>
			</td>
		</tr>





	</tbody>
</table>

## Dependencies
- [request](https://www.npmjs.com/package/request) (installed via `npm install`)


# Screen shots
A few sample Screen Shots to show you what this module looks like. It's fairly configurable and changes considerably depending on how you use Todoist, how many projects you include, and how you sort.  

Options enabled: orderBy:todoist, showProjects: true
![My image](http://cbrooker.github.io/MMM-Todoist/Screenshots/1.png)  

Options enabled: orderBy:dueDateAsc, showProjects: true
![My image](http://cbrooker.github.io/MMM-Todoist/Screenshots/2.png)  

Options enabled: orderBy:dueDateAsc, showProjects: false
![My image](http://cbrooker.github.io/MMM-Todoist/Screenshots/3.png)  

Options enabled: orderBy:todoist, showProjects: false
![My image](http://cbrooker.github.io/MMM-Todoist/Screenshots/4.png)  

Options enabled: orderBy:todoist, showProjects: true
![My image](http://cbrooker.github.io/MMM-Todoist/Screenshots/5.png)  

Options enabled: orderBy:dueDateAsc, showProjects: true
![My image](http://cbrooker.github.io/MMM-Todoist/Screenshots/6.png)  

Options enabled: orderBy:dueDateAsc, showProjects: false
![My image](http://cbrooker.github.io/MMM-Todoist/Screenshots/7.png)  


##Attribution

This project is based on work done by Paul-Vincent Roll in the MMM-Wunderlist module. (https://github.com/paviro/MMM-Wunderlist)


The MIT License (MIT)
=====================

Copyright © 2016 Chris Brooker

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the “Software”), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

**The software is provided “as is”, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.**
