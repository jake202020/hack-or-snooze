$(async function() {
	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $('#all-articles-list');
	const $body = $('body');
	const $submitForm = $('#submit-form');
	const $navSubmit = $('#nav-submit');
	const $navFavorites = $('#nav-favorites');
	const $mainNav = $('#logged-in-nav');
	const $favoritedStories = $('#favorited-articles');
	const $filteredArticles = $('#filtered-articles');
	const $loginForm = $('#login-form');
	const $createAccountForm = $('#create-account-form');
	const $navLogin = $('#nav-login');
	const $navLogOut = $('#nav-logout');
	const $userProfile = $('#user-profile');
	const $ownStories = $('#my-articles');

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();

	/**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

	$loginForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $('#login-username').val();
		const password = $('#login-password').val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser = userInstance;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

	$createAccountForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name = $('#create-account-name').val();
		let username = $('#create-account-username').val();
		let password = $('#create-account-password').val();

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
   * Log Out Functionality
   */

	$navLogOut.on('click', function() {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory
		location.reload();
		hideElements();
	});

	// Submitting a new story

	$submitForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page refresh

		// the info from the form
		const title = $('#title').val();
		const url = $('#url').val();
		const hostName = getHostName(url);
		const author = $('#author').val();
		const username = currentUser.username;

		const storyObject = await storyList.addStory(currentUser, {
			title,
			author,
			url,
			username
		});

		// generate html for the new story
		const $li = generateStoryHTML(storyObject);

		// have the new story at the top of the list
		$allStoriesList.prepend($li);

		// hide/reset submit form
		$submitForm.slideUp('slow');
		$submitForm.trigger('reset');
	});

	/**
   * Event Handler for Deleting a Single Story
   */

	$ownStories.on('click', '.trash-can', async function(evt) {
		// get the Story's ID
		const $closestLi = $(evt.target).closest('li');
		const storyId = $closestLi.attr('id');

		// remove the story from the API
		await storyList.removeStory(currentUser, storyId);

		generateMyStories();
		$ownStories.show();

		// // re-generate the story list
		// await generateStories();

		// // hide everyhing
		// hideElements();

		// // ...except the story list
		// $allStoriesList.show();
	});

	/**
   * Event Handler for Clicking Login
   */

	$navLogin.on('click', function() {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	/**
   * Event handler for Navigation to Homepage
   */

	$('body').on('click', '#home', async function() {
		hideElements();
		await generateStories();
		$allStoriesList.show();
	});

	/**
   * Event handler for Navigation to My Stories
   */

	$body.on('click', '#nav-my-stories', function() {
		hideElements();
		if (currentUser) {
			generateMyStories();
			$ownStories.show();
		}
	});

	/**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem('token');
		const username = localStorage.getItem('username');

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
		}
		$userProfile.hide();
	}

	/**
   * A rendering function to run to reset the forms and hide the login info
   */

	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');

		// show the stories
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();
		$submitForm.hide();
	}

	/**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}

	/**
   * A function to render HTML for an individual Story instance
   */

	function generateStoryHTML(story, isOwnStory) {
		let hostName = getHostName(story.url);

		// ternary operator for favorited story or not
		let starType = isFavorite(story) ? 'fas' : 'far';

		// render a trash can for deleting your own story
		const trashCanIcon = isOwnStory ? `<span class="trash-can"><i class="fas fa-trash-alt"></i></span>` : '';

		// render story markup
		const storyMarkup = $(`
	  <li id="${story.storyId}">
	  ${trashCanIcon}
	  <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

		return storyMarkup;
	}

	/**
   * Event handler for Navigation to Favorites
   */

	$body.on('click', '#nav-favorites', function() {
		hideElements();
		if (currentUser) {
			generateFaves();
			$favoritedStories.show();
		}
	});

	/* is a story in the user's list of favorites */

	function isFavorite(story) {
		let favStoryIds = new Set();
		if (currentUser) {
			favStoryIds = new Set(currentUser.favorites.map((obj) => obj.storyId));
		}
		return favStoryIds.has(story.storyId);
	}

	/**
   * Starring favorites event handler
   *
   */

	$('.articles-container').on('click', '.star', async function(evt) {
		if (currentUser) {
			const $tgt = $(evt.target);
			const $closestLi = $tgt.closest('li');
			const storyId = $closestLi.attr('id');

			// if the item is already favorited
			if ($tgt.hasClass('fas')) {
				// remove the favorite from the user's list
				await currentUser.removeFavorite(storyId);
				// then change the class to be an empty star
				$tgt.closest('i').toggleClass('fas far');
			} else {
				// the item is favorited
				await currentUser.addFavorite(storyId);
				$tgt.closest('i').toggleClass('fas far');
			}
		}
	});

	/**
   * A rendering function to build the favorites list
   */

	function generateFaves() {
		// empty out the list by default
		$favoritedStories.empty();

		// if the user has no favorites
		if (currentUser.favorites.length === 0) {
			$favoritedStories.append('<h5>No favorites added!</h5>');
		} else {
			// for all of the user's favorites
			for (let story of currentUser.favorites) {
				// render each story in the list
				let favoriteHTML = generateStoryHTML(story);
				$favoritedStories.append(favoriteHTML);
			}
		}
	}

	function generateMyStories() {
		$ownStories.empty();

		// if the user has no stories that they have posted
		if (currentUser.ownStories.length === 0) {
			$ownStories.append('<h5>No stories added!</h5>');
		} else {
			// for all of the user's posted stories
			for (let story of currentUser.ownStories) {
				// render each story in the list
				let ownStoryHTML = generateStoryHTML(story, true);
				$ownStories.append(ownStoryHTML);
			}
		}

		$ownStories.show();
	}

	/**
   * Event Handler for Navigation Submit
   */

	$navSubmit.on('click', function() {
		if (currentUser) {
			hideElements();
			$allStoriesList.show();
			$submitForm.slideToggle();
		}
	});

	/* hide all elements in elementsArr */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$favoritedStories,
			$loginForm,
			$createAccountForm,
			$userProfile,
			$ownStories
		];
		elementsArr.forEach(($elem) => $elem.hide());
	}

	function showNavForLoggedInUser() {
		$navLogin.hide();
		$navLogOut.show();
		$submitForm.show();
		$navSubmit.show();
		$navFavorites.show();
		$mainNav.show();
	}

	/* simple function to pull the hostname from a URL */

	function getHostName(url) {
		let hostName;
		if (url.indexOf('://') > -1) {
			hostName = url.split('/')[2];
		} else {
			hostName = url.split('/')[0];
		}
		if (hostName.slice(0, 4) === 'www.') {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem('token', currentUser.loginToken);
			localStorage.setItem('username', currentUser.username);
		}
	}
});
