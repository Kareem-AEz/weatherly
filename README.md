![Sendy](assets/wetherly-og.jpg)

# 🌦️ Weatherly: A Dynamic Weather and Location Tracker

**Weatherly** is a JavaScript-powered weather and location tracker app that brings real-time weather updates, intuitive geolocation, and a smooth user experience. With its dynamic features, Weatherly is designed to make weather tracking interactive and straightforward.

---

## 🌟 Features

- **Real-Time Weather Updates**  
  Fetch weather data for any location using [Open-Meteo API](https://open-meteo.com) with hourly details like temperature and wind speed.

- **Geolocation Services**  
  Automatically determine your location using the browser's geolocation API and reverse geocode it to provide weather details.

- **Favorites Management**  
  Add and organize favorite locations with a clean UI, enabling quick weather checks for saved locations.

- **Search Functionality**  
  Find locations worldwide through [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) with error handling for invalid inputs.

- **Interactive Map Integration**  
  Visualize locations on an embedded map powered by **Leaflet.js**, with smooth zooming and panning transitions.

- **Persistent Local Storage**  
  Save your favorite locations in the browser using `localStorage`, ensuring data remains between sessions.

---

## 🛠️ Technologies Used

- **JavaScript (ES6+)**  
  Leveraging classes, promises, and async/await for modular, maintainable, and dynamic code.

- **APIs**:
  - [Open-Meteo](https://open-meteo.com): Weather data with hourly and current forecasts.
  - [BigDataCloud](https://www.bigdatacloud.com/): Reverse geocoding for human-readable addresses.
  - [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/): Forward geocoding for search functionality.

- **Leaflet.js**  
  For interactive map rendering and geospatial data visualization.

- **CSS**  
  Custom styles for polished visuals, though the app is not yet responsive.

---

## 📂 File Structure
- `app.js`: Core logic including classes for APIs, geolocation, weather, and UI rendering.
- `index.html`: Base structure of the application.
- `styles.css`: Custom styles for the application.
- `sprite.svg`: SVG icons used across the application.

---

### Key Components

- **`app.js`**  
  Contains the core logic, organized into classes:
  - `APIWorker`: Handles API requests and responses.
  - `GeoLocation`: Manages geolocation and reverse geocoding.
  - `Weather`: Fetches weather data.
  - `UI`: Updates the UI dynamically and manages feedback messages.
  - `App`: Orchestrates the app, initializes features, and binds event listeners.

- **`styles.css`**  
  Handles visual design for the application, including styles for the map, loaders, buttons, and weather cards.

---

## 🤝 Contributing
Contributions are welcome! If you'd like to improve this app or add new features:

- Fork the repository.
- Create a new branch (git checkout -b feature-name).
- Commit your changes (git commit -m "Add feature").
- Push to the branch (git push origin feature-name).
- Open a pull request.
