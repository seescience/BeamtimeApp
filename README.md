# BeamtimeApp

![License](https://img.shields.io/badge/License-MIT-teal.svg) ![Python](https://img.shields.io/badge/Python-3.13-22558a.svg?logo=python&color=22558a) ![Flask](https://img.shields.io/badge/Flask-v3.1.0-3b9388.svg?logo=fastapi&color=3b9388)

BeamtimeApp is a Flask application used to generate the required folders, DOI and collection data links (Globus/Nextcloud) for the users beamtime in APS sector 13."

---
## Table of Contents

- [Installation](#installation)
- [Contribution](#contributing)
- [License](#license)

---
## Installation

### Development
To set up the project for development, just clone the repository and install in development mode. Pre-commit hooks need to be installed as well.

```bash
git clone -b development https://github.com/seescience/BeamtimeApp.git && cd BeamtimeApp && pip install -e ".[development]" && pre-commit install
```

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