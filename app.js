"use-strict";

/*------------ query selectors ------------*/

const favorites = {
	header: document.querySelector(".favorites__header"),
	timer: document.querySelector(".favorites__timer-time"),
	btnRefresh: document.querySelector(".timer-refresh"),
	sectionEdit: document.querySelector(".favorites__header-right"),
	btnEdit: document.querySelector(".favorites-edit"),
	btnEditConfirm: document.querySelector(".favorites-edit__confirm"),
	btnEditCancel: document.querySelector(".favorites-edit__cancel"),
	actionsContainer: document.querySelector(".favorites-edit__action"),
	section: document.querySelector(".section-favorites"),
	containerDiv: document.querySelector(".favorites__container"),
};

const main = {
	searchForm: document.querySelector(".search-form"),
	inputSearch: document.querySelector(".search__input"),
	btnSearch: document.querySelector(".btn__search"),
	btnLocate: document.querySelector(".btn__locate"),
	btnRefresh: document.querySelector(".timer-refresh"),

	message: document.querySelector(".feedback-message"),
	messageState: document.querySelector(".feedback-message span"),
	messageText: document.querySelector(".feedback-message p"),
	searchLoader: document.querySelector(".search-loader"),
};

const current = {
	itemsContainer: document.querySelector(".current__items"),
	Container: document.querySelector(".section-current"),
};

/*------------******** API worker ********------------*/
class APIWorker {
	constructor() {}

	async APIFetcherAndValidator(url) {
		try {
			// fetching data
			const response = await fetch(url);

			// handling none 200 responses
			if (!response.ok) {
				throw new Error(
					`Something went wrong fetching API: ${response.status}`
				);
			}

			return await response.json();
		} catch (error) {
			throw new Error(`Something went wrong fetching API: check your internet`);
		}
	}
}

/*------------******** geolocation ********------------*/
class GeoLocation extends APIWorker {
	constructor() {
		super();
	}

	getCurrentPosition() {
		// rejecting promise if the browser doesn't support it
		if (!navigator.geolocation)
			return new Promise.reject(
				new Error(`Geolocation isn't supported by this browser!`)
			);

		// handling geoLocation
		return new Promise((resolve, reject) =>
			navigator.geolocation.getCurrentPosition(resolve, (error) => {
				let errMessage = {
					1: "User denied geolocation.",
					2: "Position unavailable.",
					3: "The request to get user location timed out.",
				};

				reject(new Error(errMessage[error.code]));
			})
		);
	}

	async reverseGeoCoding({ lat, lon }) {
		try {
			const data = await this.APIFetcherAndValidator(`
			https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}
		`);

			if (!data) throw new Error("We couldn't get that");

			return { success: true, data };
		} catch (error) {
			// console.error(`Reverse Geo Coding Error: ${error.message}`);
			return { success: false, error: error.message };
		}
	}

	async forwardGeoCoding(searchQuery) {
		try {
			const [data] = await this.APIFetcherAndValidator(
				`https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=jsonv2&limit=1`
			);

			if (!data) throw Error(`We couldn't get that!`);

			return { success: true, data };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}
}

/*------------******** weather ********------------*/
class Weather extends APIWorker {
	constructor() {
		super();
	}

	async fetchWeather({ lat, lon } = {}) {
		try {
			const data = await this.APIFetcherAndValidator(
				`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,wind_speed_10m&wind_speed_unit=ms&forecast_days=1`
			);

			return { success: true, data };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}
}

/*------------******** location ********------------*/
class Location extends Weather {
	constructor(object) {
		super();
		this.country = object.country;
		this.coords = object.coords || { lat: object.lat, lon: object.lon };

		this.ID = object.place_id || object.ID;
		this.name = object.name;
		this.fullName = object.display_name || object.fullName;
		this.boundingBox = object.boundingbox || object.boundingBox;
		this.weather = object.weather || {};
	}

	async getWeatherData() {
		const data = await this.fetchWeather(this.coords);
		if (!data.success) {
			return { success: false, error: data.error };
		}
		this.weather = data.data;
		return { success: true };
	}

	static toJson(obj) {
		return new Location(obj);
	}
}

/*------------******** ui ********------------*/
class UI {
	#messageTimeout = null;
	#searchLoader = main.searchLoader;
	#searchInput = main.inputSearch;
	#favSection = favorites.section;
	constructor() {}

	/*------------ utilities ------------*/
	/**
	 * Display a feedback message
	 * @param {object} options - Configuration object
	 * @param {string} options.message - The message text to display
	 * @param {string} options.status - The status type ('success', 'error', 'info')
	 * @param {number} options.duration - The duration for the message to stay visible (in ms)
	 */
	displayMessage({
		message = "Something unexpected happened!",
		status = "info",
		duration = 3500,
	} = {}) {
		// UI elements
		const messageElement = main.message;
		const messageContent = main.messageText;
		const messageState = main.messageState;

		// valid status types
		const validTypes = ["success", "error", "info"];

		// validate status
		if (!validTypes.includes(status))
			throw new Error(`The error type isn't valid`);

		// remove previous status classes
		messageElement.className = messageElement.className.replace(
			/ feedback-message--(success|error|info)/g,
			""
		);

		// add new status class
		messageElement.classList.add(`feedback-message--${status}`);

		// update content
		messageContent.textContent = message;
		messageState.textContent = status[0].toUpperCase() + status.slice(1);

		// show message
		messageElement.classList.remove("feedback-message--hidden");

		// clear previous timeout if exists
		if (this.#messageTimeout) clearTimeout(this.#messageTimeout);

		// set timeout to hide the message
		this.#messageTimeout = setTimeout(() => {
			messageElement.classList.add("feedback-message--hidden");
		}, duration);
	}

	async createFavItem(countryNLocationsObj) {
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		const currentDay = days[new Date().getDay()];

		const entries = Object.entries(countryNLocationsObj);
		const fragment = document.createDocumentFragment();

		const weatherPromises = Object.values(countryNLocationsObj)
			.flat(2)
			.map(async (location) => {
				const data = await location.getWeatherData();
				if (!data.success) {
					return { success: false, error: data.error };
				}

				return { success: true };
			});

		const weatherResults = await Promise.allSettled(weatherPromises);
		const failedRequests = weatherResults.filter((res) => !res.value.success);

		if (failedRequests.length) {
			console.warn(`${failedRequests.length} weather requests failed.`);
			this.displayMessage({
				message: `${failedRequests.length} weather requests failed.`,
				status: "info",
			});
		}

		if (weatherResults.length === failedRequests.length) {
			return {
				success: false,
				error: `Couldn't refresh all the weather data!`,
			};
		}

		// Check if an existing favorites__container exists and remove it
		this.removeFavContainer();

		const divFavContainer = document.createElement("div");
		divFavContainer.classList.add("favorites__container");

		for (const [country, locations] of entries) {
			const articleHTML = `
					<article
						class="favorites__wrapper"
						data-country="${country}"
					>
						<h3 class="favorites__country">${country}</h3>
						<ul class="favorites__items">
							${locations
								.map(
									(item) =>
										`
								<li class="weather__item" data-id= ${item.ID}>
								<div class="weather__info--top">
									<h4 class="weather__info-day">${currentDay}</h4>
									<p class="weather__info-place">${item.name}</p>
								</div>

								<div class="weather__info--bottom">
									<div class="weather__info-wind">
										<svg><use xlink:href="sprite.svg#wind"></use></svg>
										<span>${item.weather.current.wind_speed_10m} m/sec</span>
									</div>
									<span class="weather__info-temprature"
										>${item.weather.current.temperature_2m} <span> &deg;C</span></span
									>
								</div>
								</li>
								`
								)
								.join(" ")}
						</ul>
					</article>
		`;
			divFavContainer.innerHTML += articleHTML; // Append each article
		}

		// Append the updated container to the fragment
		fragment.appendChild(divFavContainer);

		// Append the fragment to the favorites section
		this.#favSection.append(fragment);

		return { success: true };
	}

	createCurrentItem(locationObj) {
		const {
			temperature_2m: temps,
			time,
			wind_speed_10m: windSpeed,
		} = locationObj.weather.hourly;
		const nowHour = new Date().getHours();
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		const currentDay = days[new Date().getDay()];

		const foreCastedElements = temps
			.map((temp, i) => {
				let active = "";
				if (nowHour === i) active = "weather__item--selected";
				return `
			<li class="weather__item current__item ${active}">
				<p class="weather__item-current-time">${`${i + ""}`.padStart(2, "0")}:00</p>
				<div class="weather__info--top">
					<h2 class="weather__info-day">${currentDay}</h2>
					<p class="weather__info-place">${locationObj.name}</p>
				</div>

				<div class="weather__info--bottom">
					<div class="weather__info-wind">
						<svg><use xlink:href="sprite.svg#wind"></use></svg>
						<span>${windSpeed[i]} m/sec</span>
					</div>
					<span class="weather__info-temprature"
						>${temp} <span> &deg;C</span></span
					>
				</div>
			</li>
`;
			})
			.join("");
		current.itemsContainer.innerHTML = "";
		current.itemsContainer.innerHTML = foreCastedElements;
	}

	/*------------ helpers ------------*/
	showEdit() {
		favorites.btnEdit.classList.add("hidden");
		favorites.actionsContainer.classList.remove("hidden");
	}
	hideEdit() {
		favorites.btnEdit.classList.remove("hidden");
		favorites.actionsContainer.classList.add("hidden");
	}

	showLoader() {
		this.#searchLoader.classList.remove("visually-hidden");
	}
	hideLoader() {
		this.#searchLoader.classList.add("visually-hidden");
	}

	searchInputHardReset() {
		this.#searchInput.value = "";
		this.#searchInput.blur();
	}

	searchInputReset() {
		this.#searchInput.value = "";
		this.#searchInput.focus();
	}

	removeFavContainer() {
		// Check if an existing favorites__container exists and remove it
		const existingContainer = this.#favSection.querySelector(
			".favorites__container"
		);
		if (existingContainer) {
			existingContainer.remove();
		}
	}
}

/*------------******** app ********------------*/
class App {
	#MAX_LOCATIONS = 12;
	#currentActiveItem = null;
	#locations = {};
	#isEditing = false;
	#ElementsToRemove = [];
	#map = null;

	constructor() {
		this.initApp();
	}

	/*------------ one time methods ------------*/
	// init
	initApp() {
		if (window.screen.width <= 768) {
			this.handleInfo("The page isn't responsive for mobile phones yet!");
		}
		// initializing services
		this.geo = new GeoLocation();
		this.weather = new Weather();
		this.ui = new UI();
		this.#initMap();

		this.#attachEventListeners();
		this.parseLocationsAndConvertAndDisplay();
	}

	// binding eventlistener
	#attachEventListeners() {
		main.searchForm.addEventListener("click", this.#handleForm.bind(this));
		favorites.btnRefresh.addEventListener(
			"click",
			this.#handleRefresh.bind(this)
		);
		favorites.section.addEventListener(
			"click",
			this.#handleFavItemClick.bind(this)
		);
		favorites.sectionEdit.addEventListener(
			"click",
			this.#handleEdit.bind(this)
		);
	}

	/*------------ utilities ------------*/
	// display ui messages
	handleError(message) {
		const options = { message, status: "error", duration: 3500 };
		this.ui.displayMessage(options);
	}
	handleInfo(message) {
		const options = { message, status: "info", duration: 3500 };
		this.ui.displayMessage(options);
	}
	handleSuccess(message) {
		const options = { message, status: "success", duration: 3500 };
		this.ui.displayMessage(options);
	}
	#locationPusher(object) {
		const locations = Object.values(this.#locations).flat();
		const numberOfLocations = locations.length;

		// ! handle duplicates
		if (locations.some((location) => location.ID === object.ID)) {
			return {
				success: false,
				error: `${object.name} already exists.`,
			};
		}

		// ! handle to many locations
		if (numberOfLocations >= this.#MAX_LOCATIONS)
			return {
				success: false,
				error: `uuh, sorry! we couldn't add more than ${this.#MAX_LOCATIONS}`,
			};

		if (!(object.country in this.#locations))
			// create a country in not exists
			this.#locations[object.country] = [];

		// push the location to the country
		this.#locations[object.country].push(object);

		return { success: true, data: this.#locations };
	}

	#saveLocations() {
		localStorage.setItem("locations", JSON.stringify(this.#locations));
	}
	async parseLocationsAndConvertAndDisplay() {
		try {
			const locations = JSON.parse(localStorage.getItem("locations"));

			if (!locations || Object.keys(locations).length === 0) return;

			const LocationsArray = Object.values(locations).flat(2);

			this.ui.showLoader();
			// parse and push
			const [locationPusherData] = LocationsArray.map((loc) =>
				this.#locationPusher(Location.toJson(loc))
			);
			if (!locationPusherData.success) {
				this.handleError(locationPusherData.error);
				throw new Error(locationPusherData.error);
			}

			await this.ui.createFavItem(this.#locations);
		} catch (error) {
			console.error(error.message);
			this.handleError(`Couldn't load the data!`);
		} finally {
			this.ui.hideLoader();
		}
	}

	#initMap() {
		this.#map = L.map("map").setView([29.4, 31], 9);

		L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this.#map);
	}
	/*------------ handlers ------------*/
	// handling refresh
	async #handleRefresh() {
		try {

			if(Object.values(this.#locations).length === 0) {
				this.handleInfo("Nothing's there to refresh!");
				return;
			}
			
			this.handleInfo("Refreshing!");
			this.ui.showLoader();

			const refreshState = await this.ui.createFavItem(this.#locations);
			if (!refreshState.success) {
				throw new Error(refreshState.error);
			}

			this.handleSuccess("Refreshed!");
		} catch (error) {
			console.error(error);
			this.handleError("Something wrong happened refreshing!");
		} finally {
			this.ui.hideLoader();
		}
	}

	//handling search form
	async #handleForm(e) {
		try {
			e.preventDefault();

			const target = e.target;

			// if search button clicked
			if (target === main.btnSearch) await this.#handleSearch();

			// if locate button clicked
			if (target.closest(`.btn__locate`) === main.btnLocate)
				await this.#handleLocate();

			this.#saveLocations();
		} catch (error) {
			console.error(`Unexpected error: ${error.message}`);
		}
	}

	// Search logic
	async #handleSearch() {
		try {
			const searchInput = main.inputSearch;

			// showing the loader
			this.ui.showLoader();

			// throw error if empty
			if (!searchInput.value) {
				// ! handling error: no query entered
				this.handleError(`Please enter a city.`);
				throw new Error("Search Input can't be empty.");
			}

			// forward geo coding
			const searchQuery = searchInput.value.trim();
			const forwardGeoData = await this.geo.forwardGeoCoding(searchQuery);
			console.log(forwardGeoData);
			if (!forwardGeoData.success) {
				// ! handling error: forward geocoding
				this.handleError("Whooa, is this on mars? we couldn't get that!");
				throw new Error(forwardGeoData.error);
			}

			// validate search result
			const validatedData = this.validateSearchQueryResult(forwardGeoData.data);
			if (!validatedData.success) {
				// ! handle error: validating search type
				this.handleInfo("Please enter a city, town, etc...");
				throw new Error(validatedData.error);
			}

			// getting country name- splitting the name into an array
			const array = this.#arrayFromCommas(validatedData.data.display_name);
			// getting the last element in the array
			const country = this.#getCountryFromArray(array);

			const location = new Location({ ...validatedData.data, country });
			const locationPusherData = this.#locationPusher(location);
			// ! handling error: while pushing locations
			if (!locationPusherData.success) {
				this.handleError(locationPusherData.error);
				throw new Error(locationPusherData.error);
			}

			// building UI items
			const elementsState = await this.ui.createFavItem(
				locationPusherData.data
			);

			// ! handling error: while pushing locations
			if (!elementsState.success) {
				this.handleError(elementsState.error);
				throw new Error(elementsState.error);
			}
			//* success
			this.handleSuccess(`We added ${forwardGeoData.data.name}`);
			this.ui.searchInputHardReset();
		} catch (error) {
			console.error(`Search error: ${error.message}`);
			this.ui.searchInputReset();
		} finally {
			this.ui.hideLoader();
		}
	}

	// Locate logic
	async #handleLocate() {
		try {
			// showing the loader
			this.ui.showLoader();

			// fetching current position
			const position = await this.#getCurrentPosition();
			if (!position.success) {
				//! handling error
				this.handleError("Couldn't get your location.");
				throw new Error(position.error);
			}

			// reversing geo location
			const { latitude: lat, longitude: lon } = position.position.coords;

			const reverseGeoData = await this.geo.reverseGeoCoding({ lat, lon });
			if (!reverseGeoData.success) {
				//! handling error
				this.handleError("Unable to fetch reverse geocoding data.");
				throw new Error(reverseGeoData.error);
			}

			// forward geocoding
			const forwardGeoCodingData = await this.geo.forwardGeoCoding(
				reverseGeoData.data.city
			);
			if (!forwardGeoCodingData.success) {
				// ! handling error: forward geocoding
				this.handleError("Unexpected error happening getting your location!");
				throw new Error("Couldn't get user's location.");
			}
			main.inputSearch.value = forwardGeoCodingData.data.display_name;

			this.#panMap(lat, lon, 15);

			//* success
			this.handleSuccess(`You're in ${reverseGeoData.data.city}`);
			console.log("position fetched successfully!");
		} catch (error) {
			console.error(`Locate error: ${error.message}`);
		} finally {
			this.ui.hideLoader();
		}
	}

	// handling clicking of fav locations
	async #handleFavItemClick(e) {
		const clickedElement = e.target;

		// checking if favItem is correct
		if (!clickedElement.closest(".weather__item")) return;
		const item = clickedElement.closest(".weather__item");
		const itemID = item.dataset.id;

		if (!this.#isEditing) {
			try {
				// return if the clicked item is the current active item
				if (this.#currentActiveItem === item) return;

				// showing loader
				this.ui.showLoader();

				// remove the active state from the previously clicked item
				if (this.#currentActiveItem)
					this.#currentActiveItem.classList.remove("weather__item--selected");

				// add the active class and state to the current item
				item.classList.add("weather__item--selected");
				this.#currentActiveItem = item;

				// getting the location for the item ID
				const location = this.#locationGetterByID(itemID);

				const weatherData = await location.getWeatherData();
				if (!weatherData.success) {
					this.handleError(`Couldn't get the forecast data!`);
					throw new Error(`Couldn't get the forecast data`);
				}

				// pan map
				this.#panMap(location.coords.lat, location.coords.lon);

				this.ui.createCurrentItem(location);

				// implementing scrolling
				const currentItemHour = current.itemsContainer.querySelector(
					".weather__item--selected"
				);
				const itemRect = currentItemHour.getBoundingClientRect();

				const container = current.Container;
				const containerRect = container.getBoundingClientRect();

				const offset =
					itemRect.left - containerRect.left + container.scrollLeft - 15;
				const maxScroll = container.scrollWidth;

				container.scrollTo({
					left: Math.min(offset, maxScroll),
					behavior: "smooth",
				});
			} catch (error) {
				console.error(error);
			} finally {
				this.ui.hideLoader();
			}
		}

		if (this.#isEditing) {
			const index = this.#ElementsToRemove.indexOf(item);
			if (index > -1) {
				this.#ElementsToRemove.splice(index, 1);
				item.style.opacity = 1;
			} else {
				this.#ElementsToRemove.push(item);
				item.style.opacity = 0.2;
			}
		}
	}

	#handleEdit(e) {
		const clickedElement = e.target;

		// edit click
		if (clickedElement.closest(".favorites-edit") === favorites.btnEdit) {
			// setting flag to editing
			this.#isEditing = true;
			this.ui.showEdit();
		}

		// cancel click
		if (
			clickedElement.closest(".favorites-edit__cancel") ===
			favorites.btnEditCancel
		) {
			this.#isEditing = false;
			this.#ElementsToRemove.forEach((el) => (el.style.opacity = 1));
			this.#ElementsToRemove.length = 0;
			this.ui.hideEdit();
		}

		// confirm click
		if (
			clickedElement.closest(".favorites-edit__confirm") ===
			favorites.btnEditConfirm
		) {
			this.#isEditing = false;
			this.ui.hideEdit();

			const IDs = this.#ElementsToRemove.map((el) => +el.dataset.id);

			if (IDs.length === 0) {
				this.handleInfo("No locations selected!");
				return;
			}

			const newLocations = Object.values(this.#locations)
				.flat(1)
				.reduce((acc, loc) => {
					if (!IDs.includes(loc.ID)) {
						acc.push(loc);
					}
					return acc;
				}, []);

			this.#locations = {};
			newLocations.forEach((loc) => this.#locationPusher(loc));
			this.ui.createFavItem(this.#locations);

			if (Object.keys(this.#locations).length === 0) {
				this.ui.removeFavContainer();
			}
			current.itemsContainer.innerHTML = "";

			this.#saveLocations();
		}
	}

	/*------------ helpers ------------*/
	#locationGetterByID(id) {
		return Object.values(this.#locations)
			.flat()
			.find((loc) => loc.ID === +id);
	}

	async #getCurrentPosition() {
		try {
			const position = await this.geo.getCurrentPosition();
			return { success: true, position };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	validateSearchQueryResult(obj) {
		const validTypes = [
			"city",
			"state",
			"town",
			"suburb",
			"village",
			"neighbourhood",
		];

		console.log(obj);

		if (!validTypes.includes(obj.addresstype)) {
			return {
				success: false,
				error: `The value isnt a city, state, town, suburb, village or neigbourhood`,
			};
		}

		return { success: true, data: obj };
	}

	/*------------ utilities ------------*/
	#arrayFromCommas(query) {
		return query.split(", ");
	}
	#getCountryFromArray(array) {
		return array[array.length - 1];
	}
	#panMap(lat, long, zoom = 12) {
		this.#map.flyTo([lat, long], zoom, {
			duration: 2.168,
			animate: true,
		});
	}
}

const app = new App();
