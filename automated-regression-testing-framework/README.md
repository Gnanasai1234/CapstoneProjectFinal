# Automated Regression Testing Framework

## Overview
This project is an Automated Regression Testing Framework designed to facilitate the testing of applications through automated regression tests. It integrates seamlessly with CI/CD and DevOps pipelines, ensuring that code changes do not introduce new bugs.

## Project Structure
The project is organized as follows:

```
automated-regression-testing-framework
├── src
│   ├── tests
│   │   ├── regression
│   │   │   └── sampleTest.spec.js
│   │   └── utils
│   │       └── helper.js
│   ├── config
│   │   ├── testConfig.js
│   │   └── ciConfig.js
│   └── reports
│       └── README.md
├── .github
│   └── workflows
│       └── ci.yml
├── .gitignore
├── package.json
├── README.md
└── jest.config.js
```

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node package manager)

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd automated-regression-testing-framework
   ```
3. Install the dependencies:
   ```
   npm install
   ```

### Running Tests
To run the regression tests locally, use the following command:
```
npm test
```

### CI/CD Integration
This project includes a GitHub Actions workflow defined in `.github/workflows/ci.yml`. The workflow is triggered on push and pull request events, ensuring that tests are executed automatically in the CI/CD pipeline.

### Test Reports
Test reports are generated and can be found in the `src/reports` directory. Refer to the `src/reports/README.md` for instructions on how to access and interpret these reports.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.