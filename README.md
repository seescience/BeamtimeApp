# BeamtimeApp

![License](https://img.shields.io/badge/License-MIT-teal.svg) ![Python](https://img.shields.io/badge/Python-3.13-22558a.svg?logo=python&color=22558a) ![Flask](https://img.shields.io/badge/Flask-v3.1.0-3b9388.svg?logo=fastapi&color=3b9388) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?logo=typescript&color=3178C6)

BeamtimeApp is a Flask application used to generate the required folders, DOI and collection data links (Globus/Nextcloud) for the users beamtime in APS sector 13.

---
## Table of Contents

- [Installation](#installation)
- [Development](#development)
- [Running the Application](#running-the-application)
- [Contributing](#contributing)
- [License](#license)

---
## Installation

### Prerequisites

- **Python 3.13** (required)
- **UV** (required if using the included startup scripts)
- **Node.js** (for TypeScript compilation during development)
- **npm** (comes with Node.js)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone -b development https://github.com/seescience/BeamtimeApp.git
   cd BeamtimeApp
   ```

2. **Install Python dependencies using UV:**
   ```bash
   uv sync --dev
   pre-commit install
   ```
   
   **Note:** This project uses [UV](https://github.com/astral-sh/uv) for Python dependency management. The startup scripts (`start_beamtime_app.sh` and `start_beamtime_app_devel.sh`) use `uv run` to execute the application.

3. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

4. **Build TypeScript:**
   ```bash
   npm run build
   ```

---
## Development

### TypeScript Development

The frontend is written in TypeScript and located in `beamtime_app/static/src/`. 

**Available npm scripts:**
- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for automatic compilation during development
- `npm run clean` - Remove compiled JavaScript files
- `npm run clean:pycache` - Remove Python cache directories
- `npm run clean:all` - Clean both JavaScript and Python cache files

**Development workflow:**
1. Edit TypeScript files in `beamtime_app/static/src/`
2. Run `npm run build` or `npm run watch` to compile
3. Compiled files are output to `beamtime_app/static/js/`
4. Refresh your browser to see changes

### Python Development

The backend is a Flask application. Follows standard Python development practices:
- Code is organized in the `beamtime_app/` package
- Uses pre-commit hooks for code quality

---
## Running the Application

### Development Mode

The development script automatically builds TypeScript before starting:

```bash
./start_beamtime_app_devel.sh
```

This will:
1. Build TypeScript files
2. Start Flask in debug mode on port 5001
3. Enable auto-reload on code changes

Access the application at: `http://localhost:5001`

### Production Mode

For production, compiled JavaScript files should already be in the repository:

```bash
./start_beamtime_app.sh
```

**Notes:**
- Production does not require Node.js/npm as compiled files are committed to the repository
- UV is still required if you choose to use the startup script to execute the application

---
## Contributing

All contributions to the BeamtimeApp project are welcome! Here are some ways you can help:
- Report a bug by opening an [issue](https://github.com/seescience/BeamtimeApp/issues).
- Add new features, fix bugs or improve documentation by submitting a [pull request](https://github.com/seescience/BeamtimeApp/pulls).

Please adhere to the [GitHub flow](https://docs.github.com/en/get-started/quickstart/github-flow) model when making your contributions! This means creating a new branch for each feature of bug fix, and submitting your changes as a pull request against the main branch. If you're not sure how to contribute, please open an issue and we'll be happy to help you out.

By contributing to the BeamtimeApp project, you agree that your contributions will be licensed under the MIT License.

---
## License

BeamtimeApp is distributed under the MIT License. You should have received a [copy](LICENSE) of the MIT License along with this program. If not, see https://mit-license.org/ for additional details.