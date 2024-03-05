**This microservice is based upon  [clm-core](https://github.com/fraunhoferfokus/clm-core) and extends the basic functionalities with additional features**

## CLM-EXT-TRACEDATA
This service is utilized for persisting xAPI statements from learners when they submit learning activities through a content provider. It routes the appropriate statements to the associated learning records stores based on group affiliations.

## Requirements
- MariaDB, set up locally.
- Node.js 20.x

### Folder Structure
root

├── api-docs # Open API 3.0.0 definition as .yaml file documenting all routes and data models this service offers.

├── docs # Developer documentation of all functions, classes, interfaces, types this service exposes as an npm package.

├── dist # The built TypeScript project transpiled to JavaScript.

└── src # Business-relevant logic for this web server.

### Architecture
![Entit Relationship Model](assets/clm.EntityRelationshipdiagram.v1p0p0.svg)

The Entity Relationship Model of the Open Core is shown above.

The `clm-ext-tracedata` module does not utilize resources on its own but leverages various resources from other modules to facilitate the saving and fetching of learning experiences of users.

#### Users ([clm-core](https://github.com/fraunhoferfokus/clm-core))
- The user is required to obtain their group memberships

#### Groups ([clm-core](https://github.com/fraunhoferfokus/clm-core))
- Group membership characteristics such as the roles associated with the group are integrated in the IMS-CC

#### ServiceProviders ([clm-ext-service_providers](https://github.com/fraunhoferfokus/clm-service_providers))
- Necessary for retrieving the user-specific Learning Record Store (LRS) of the user, in order to determine which LRS the data should be saved to.


This service functions as a web microservice that can be orchestrated through a gateway and as an npm package to provide functionalities to other CLM extensions. A microservice can build upon the classes/types/interfaces of this service to extend basic functionalities.

## Setup for testing the webserver 

1. npm install
2. Copy .env.default to .env and overwrite needed properties

Following table gives an overview of the settings you can change through the environment variables

| Name             | Example                                        | Required (Yes/No) | Description                                                                                                                                      |
|------------------|------------------------------------------------|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| PORT             | 3003                                           | Yes               | The port on which the service should be deployed.                                                                                                |
| DEPLOY_URL       | HOST_PROTOCOL://HOST_ADDRESS:GATEWAY_PORT/api  | Yes               | The address where all microservices are to be orchestrated. A /api must be appended.                                                            |
|MARIA_CONFIG|`MARIA_HOST_ADDRESS|MARIA_PORT|MARIA_DATABASE|MARIA_USER|MARIA_USER_PASSWORD`| Yes | A comma-separated string that must contain the configured parameters that were previously defined during the installation of MariaDB. |





3.1 `npm run dev` for development with nodemon
3.2 `npm start` for deployment
4.  Subsequently, the JSON representation of the Open-API specification should be accessible at:

`http://localhost:${PORT}/traceData/swagger`


# Swagger Documentation

- Accessible routes for this microservice are available at `http://localhost:PORT/traceData/swagger` after starting the service.
- Ensure to set up a reverse proxy to route traffic to the respective microservices as shown in the table.

### Changelog

The changelog can be found in the [CHANGELOG.md](CHANGELOG.md) file.

## Get in touch with a developer

Please see the file [AUTHORS.md](AUTHORS.md) to get in touch with the authors of this project.
We will be happy to answer your questions at {clm@fokus.fraunhofer.de}

## License

The project is made available under the license in the file [license.txt](LICENSE.txt)

