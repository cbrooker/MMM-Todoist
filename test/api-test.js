#!/usr/bin/env node

/**
 * MMM-Todoist API Test Script
 *
 * This script tests the Todoist API integration locally without needing
 * a full MagicMirror installation.
 *
 * Setup:
 * 1. Copy .env.example to .env
 * 2. Add your Todoist access token to .env
 * 3. Run: npm test
 */

require('dotenv').config();
const request = require('request');

// Colors for console output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
};

// Configuration from .env
const config = {
	accessToken: process.env.TODOIST_ACCESS_TOKEN,
	// Keep IDs as strings to match Todoist API response format
	projects: process.env.TEST_PROJECT_IDS ? process.env.TEST_PROJECT_IDS.split(',').map(id => id.trim()) : [],
	sections: process.env.TEST_SECTION_IDS ? process.env.TEST_SECTION_IDS.split(',').map(id => id.trim()) : [],
	labels: process.env.TEST_LABELS ? process.env.TEST_LABELS.split(',').map(l => l.trim()) : [],
	debug: process.env.DEBUG === 'true',
	apiVersion: 'v9',
	apiBase: 'https://todoist.com/API',
	todoistEndpoint: 'sync',
	todoistResourceType: '["items", "projects", "collaborators", "user", "labels", "sections"]'
};

// Helper functions
function log(message, color = colors.reset) {
	console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
	console.log('\n' + colors.bright + colors.cyan + '═'.repeat(60) + colors.reset);
	console.log(colors.bright + colors.cyan + `  ${title}` + colors.reset);
	console.log(colors.bright + colors.cyan + '═'.repeat(60) + colors.reset + '\n');
}

function logError(message) {
	log(`✗ ERROR: ${message}`, colors.red);
}

function logSuccess(message) {
	log(`✓ ${message}`, colors.green);
}

function logInfo(message) {
	log(`ℹ ${message}`, colors.blue);
}

function logWarning(message) {
	log(`⚠ ${message}`, colors.yellow);
}

// Validate configuration
function validateConfig() {
	logSection('Configuration Validation');

	if (!config.accessToken || config.accessToken === 'your_access_token_here') {
		logError('TODOIST_ACCESS_TOKEN not set in .env file');
		log('\nPlease:');
		log('1. Copy .env.example to .env');
		log('2. Get your token from: https://todoist.com/app/settings/integrations/developer');
		log('3. Add it to .env as TODOIST_ACCESS_TOKEN=your_token_here\n');
		process.exit(1);
	}

	logSuccess('Access token configured');

	if (config.projects.length > 0) {
		logInfo(`Testing with project IDs: ${config.projects.join(', ')}`);
	} else {
		logInfo('No project filter - will fetch all projects');
	}

	if (config.sections.length > 0) {
		logInfo(`Testing with section IDs: ${config.sections.join(', ')}`);
	} else {
		logInfo('No section filter - will fetch all sections');
	}

	if (config.labels.length > 0) {
		logInfo(`Testing with labels: ${config.labels.join(', ')}`);
	} else {
		logInfo('No label filter');
	}
}

// Fetch data from Todoist API
function fetchTodoistData() {
	return new Promise((resolve, reject) => {
		logSection('Fetching Data from Todoist API');

		request({
			url: `${config.apiBase}/${config.apiVersion}/${config.todoistEndpoint}/`,
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				'cache-control': 'no-cache',
				'Authorization': `Bearer ${config.accessToken}`
			},
			form: {
				sync_token: '*',
				resource_types: config.todoistResourceType
			}
		}, function(error, response, body) {
			if (error) {
				logError(`API request failed: ${error}`);
				reject(error);
				return;
			}

			if (response.statusCode !== 200) {
				logError(`API returned status code ${response.statusCode}`);
				if (config.debug) {
					log(`Response: ${body}`, colors.dim);
				}
				reject(new Error(`HTTP ${response.statusCode}`));
				return;
			}

			try {
				const data = JSON.parse(body);
				logSuccess('Successfully fetched data from Todoist');
				resolve(data);
			} catch (e) {
				logError(`Failed to parse API response: ${e.message}`);
				reject(e);
			}
		});
	});
}

// Display statistics
function displayStatistics(data) {
	logSection('Data Statistics');

	const stats = {
		'Total Tasks': data.items ? data.items.length : 0,
		'Total Projects': data.projects ? data.projects.length : 0,
		'Total Sections': data.sections ? data.sections.length : 0,
		'Total Labels': data.labels ? data.labels.length : 0,
		'Collaborators': data.collaborators ? data.collaborators.length : 0
	};

	Object.entries(stats).forEach(([key, value]) => {
		log(`  ${key}: ${colors.bright}${value}${colors.reset}`);
	});
}

// Display projects
function displayProjects(data) {
	logSection('Projects');

	if (!data.projects || data.projects.length === 0) {
		logWarning('No projects found');
		return;
	}

	data.projects.forEach(project => {
		const prefix = config.projects.length === 0 || config.projects.includes(project.id)
			? colors.green + '✓'
			: colors.dim + '○';
		log(`${prefix} ${project.name} ${colors.dim}(ID: ${project.id})${colors.reset}`);
	});

	if (config.projects.length > 0) {
		log(`\n${colors.dim}(✓ = will be included in test filtering)${colors.reset}`);
	}
}

// Display sections
function displaySections(data) {
	logSection('Sections');

	if (!data.sections || data.sections.length === 0) {
		logWarning('No sections found');
		return;
	}

	// Group sections by project
	const sectionsByProject = {};
	data.sections.forEach(section => {
		if (!sectionsByProject[section.project_id]) {
			sectionsByProject[section.project_id] = [];
		}
		sectionsByProject[section.project_id].push(section);
	});

	// Find project names
	const projectMap = {};
	if (data.projects) {
		data.projects.forEach(p => {
			projectMap[p.id] = p.name;
		});
	}

	Object.entries(sectionsByProject).forEach(([projectId, sections]) => {
		const projectName = projectMap[projectId] || `Project ${projectId}`;
		log(`\n${colors.bright}${projectName}:${colors.reset}`);

		sections.forEach(section => {
			const prefix = config.sections.length === 0 || config.sections.includes(section.id)
				? colors.green + '✓'
				: colors.dim + '○';
			log(`  ${prefix} ${section.name} ${colors.dim}(ID: ${section.id})${colors.reset}`);
		});
	});

	if (config.sections.length > 0) {
		log(`\n${colors.dim}(✓ = will be included in test filtering)${colors.reset}`);
	}
}

// Test filtering logic
function testFiltering(data) {
	logSection('Testing Filter Logic');

	if (!data.items || data.items.length === 0) {
		logWarning('No tasks to filter');
		return;
	}

	let filteredTasks = [...data.items];

	// Project filtering
	if (config.projects.length > 0) {
		const beforeCount = filteredTasks.length;
		filteredTasks = filteredTasks.filter(item =>
			config.projects.includes(item.project_id)
		);
		log(`  Project filter: ${colors.bright}${beforeCount}${colors.reset} → ${colors.green}${filteredTasks.length}${colors.reset} tasks`);
	}

	// Section filtering
	if (config.sections.length > 0) {
		const beforeCount = filteredTasks.length;
		filteredTasks = filteredTasks.filter(item =>
			config.sections.includes(item.section_id)
		);
		log(`  Section filter: ${colors.bright}${beforeCount}${colors.reset} → ${colors.green}${filteredTasks.length}${colors.reset} tasks`);
	}

	// Label filtering
	if (config.labels.length > 0) {
		const beforeCount = filteredTasks.length;
		filteredTasks = filteredTasks.filter(item => {
			if (!item.labels || item.labels.length === 0) return false;
			return item.labels.some(label => config.labels.includes(label));
		});
		log(`  Label filter: ${colors.bright}${beforeCount}${colors.reset} → ${colors.green}${filteredTasks.length}${colors.reset} tasks`);
	}

	if (config.projects.length === 0 && config.sections.length === 0 && config.labels.length === 0) {
		logInfo('No filters configured - showing all tasks');
	}

	// Display sample tasks
	if (filteredTasks.length > 0) {
		log(`\n${colors.bright}Filtered Tasks (showing first 10):${colors.reset}`);
		filteredTasks.slice(0, 10).forEach((task, i) => {
			const projectName = data.projects.find(p => p.id === task.project_id)?.name || 'Unknown';
			const sectionName = data.sections.find(s => s.id === task.section_id)?.name || 'No section';
			const dueDate = task.due ? task.due.date : 'No due date';

			log(`\n  ${i + 1}. ${colors.bright}${task.content}${colors.reset}`);
			log(`     Project: ${colors.cyan}${projectName}${colors.reset} | Section: ${colors.magenta}${sectionName}${colors.reset}`);
			log(`     Due: ${dueDate} | Priority: ${task.priority}`);
			if (task.labels && task.labels.length > 0) {
				log(`     Labels: ${task.labels.join(', ')}`);
			}
		});

		if (filteredTasks.length > 10) {
			log(`\n${colors.dim}  ... and ${filteredTasks.length - 10} more${colors.reset}`);
		}
	} else {
		logWarning('No tasks match the configured filters');
	}
}

// Main test function
async function runTests() {
	console.log(colors.bright + colors.blue + '\n╔═══════════════════════════════════════════════════════════╗');
	console.log('║          MMM-Todoist API Test Suite                      ║');
	console.log('╚═══════════════════════════════════════════════════════════╝' + colors.reset);

	try {
		// Step 1: Validate config
		validateConfig();

		// Step 2: Fetch data
		const data = await fetchTodoistData();

		// Step 3: Display statistics
		displayStatistics(data);

		// Step 4: Display projects
		displayProjects(data);

		// Step 5: Display sections
		displaySections(data);

		// Step 6: Test filtering
		testFiltering(data);

		// Success!
		logSection('Test Complete');
		logSuccess('All tests passed successfully!');
		log('\n' + colors.dim + 'You can now push your changes with confidence.' + colors.reset + '\n');

	} catch (error) {
		logSection('Test Failed');
		logError(error.message);
		if (config.debug && error.stack) {
			log('\nStack trace:', colors.dim);
			log(error.stack, colors.dim);
		}
		process.exit(1);
	}
}

// Run the tests
runTests();
