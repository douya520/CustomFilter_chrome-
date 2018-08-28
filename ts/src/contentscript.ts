/*
 2011 Maripo GODA

 */
let timeZero = new Date().getTime();
function elapsed () {
	return new Date().getTime() - timeZero;
}
let customBlockerBgCallback = null;
window.ruleEditor = null;

/**
 * Communicate with background page to control tabs and popups
 */
class BackgroundCommunicator {
	/**
	 * Send message to background page
	 */
	sendRequest (command, param) {
		param.command = command;
		console.log("sendRequest");
		console.log(param);
		this.bgPort.postMessage({command:command, param:param});
	}

	/**
	 Called when contentscript received a message from background.
	 */
	 processBackgroundRequest (request, sender, sendResponse) {
		customBlockerBgCallback = sendResponse;
		switch (request.command) {
			case 'init':
				this.execInit(request); break;
			case 'highlight':
				this.execHighlight(request); break;
			case 'ruleEditor':
				this.execRuleEditor(request); break;
			case 'ruleSaveDoneRuleSmart':
				this.execRuleSaveDoneSmartEditor(request); break;
			case 'stop':
				this.execStop(request); break;
			case 'resume':
				this.execResume(request); break;
			case 'reload':
				console.log("Reloaded.");
				this.execReload(request); break;
			case 'quickRuleCreation':
				this.execQuickRuleCreation(request); break;
		}
	}
	execInit (request) {
		let allRules = request.rules;
		if (window.customBlockerInitDone) return;
		window.customBlockerInitDone = true;
		rules = new Array();
		RuleExecutor.checkRules(allRules);
	}
	
	execHighlight (request) {
		window.elementHighlighter.highlightRule(request.rule);
	}
	
	execRuleEditor (request) {
		if (!window.ruleEditor) {
			console.log("window.ruleEditor not found.");
			window.ruleEditor = new RuleEditor();
		}
		window.ruleEditor.initialize(request.rule, request.appliedRuleList);
	}
	
	
	execRuleSaveDoneSmartEditor (request) {
		window.smartRuleCreatorDialog.onSaveDone(request.rule);
	}
	
	execStop (request) {
		if (RuleExecutor.blockInterval) window.clearInterval(RuleExecutor.blockInterval);
		RuleExecutor.blockInterval = null;
	}
	
	execResume (request) {
		if (!RuleExecutor.blockInterval)
			RuleExecutor.blockInterval = window.setInterval(RuleExecutor.execBlock, 2000);
	}
	
	execReload (request) {
		rules = new Array();
		RuleExecutor.checkRules(request.rules);
	}
	
	execQuickRuleCreation (request) {
		if (!window.smartRuleCreatorDialog) {
			window.smartRuleCreatorDialog = new SmartRuleCreatorDialog(RuleEditor.getMaxZIndex() + 1, request.src);
		}
		var creator = new SmartRuleCreator(lastRightClickedElement, request.appliedRuleList, request.selectionText, request.needSuggestion);
	}
	
	bgPort:any/* Port */;
	start () {
		let scope = this;
		chrome.runtime.onConnect.addListener(function(port) {
			console.log("Connection established.");
			console.log(port);
			scope.bgPort = port;
			port.onMessage.addListener(function(msg) {
				console.log("port.onMessage: ");
				console.log(msg);
				scope.processBackgroundRequest(msg, null, null);
		  });
		});
	}
}


chrome.extension.sendRequest({command:"requestRules"});

if (!window.elementHighlighter)
	window.elementHighlighter = new ElementHighlighter();
if (!window.bgCommunicator) {
	window.bgCommunicator = new BackgroundCommunicator();
	window.bgCommunicator.start();
}

chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
		console.warn("WARNING: Legacy request type.");
		console.warn(request);
		window.bgCommunicator.processBackgroundRequest(request, sender, sendResponse);
	}
);

// Right-clicked event source
let lastRightClickedElement = null;
let lastRightClickEvent = null; 
document.body.oncontextmenu = function(event){lastRightClickedElement=event.srcElement; lastRightClickEvent=event};
