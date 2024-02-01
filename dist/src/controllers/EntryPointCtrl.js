
/* -----------------------------------------------------------------------------
 *  Copyright (c) 2023, Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published by
 *  the Free Software Foundation, version 3.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program. If not, see <https://www.gnu.org/licenses/>.  
 *
 *  No Patent Rights, Trademark Rights and/or other Intellectual Property
 *  Rights other than the rights under this license are granted.
 *  All other rights reserved.
 *
 *  For any other rights, a separate agreement needs to be closed.
 *
 *  For more information please contact:  
 *  Fraunhofer FOKUS
 *  Kaiserin-Augusta-Allee 31
 *  10589 Berlin, Germany
 *  https://www.fokus.fraunhofer.de/go/fame
 *  famecontact@fokus.fraunhofer.de
 * -----------------------------------------------------------------------------
 */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const clm_core_1 = require("clm-core");
const clm_ext_service_providers_1 = require("clm-ext-service_providers");
const axios_1 = __importDefault(require("axios"));
const btoa_1 = __importDefault(require("btoa"));
const sha1_1 = __importDefault(require("sha1"));
const get_hash = (identifier, prop) => {
    return (0, sha1_1.default)(identifier);
};
class TraceDataController extends clm_core_1.BaseExtensionCtrl {
    constructor() {
        super(...arguments);
        this.getTraceData = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const services = (yield clm_ext_service_providers_1.spBDTOInstance.findAll()).filter((item) => item.type === 'LRS');
                // return res.json(services)
                const queryProviderId = (_a = req.query.providerId) !== null && _a !== void 0 ? _a : services[0]._id;
                const providerIndex = services.findIndex((provider) => provider._id === queryProviderId);
                const service = services.find((item) => item._id === queryProviderId);
                if (!service)
                    return next({ status: 400, message: `Provider with that id does not exist!:  ${queryProviderId}` });
                if (providerIndex < 0)
                    return next({ status: 400, message: "provider with that id not found" });
                const authToken = `Basic ${(0, btoa_1.default)(`${service.username}:${service.password}`)}`;
                let fullUrl = service.baseUrl + '/statements';
                let searchParams;
                searchParams = new URLSearchParams(req.originalUrl.split('?')[1]);
                searchParams.delete('providerId');
                searchParams.delete('hashStatements');
                searchParams.set('ascending', 'true');
                fullUrl += '?' + searchParams.toString();
                let statementResult = (yield axios_1.default.get(fullUrl, {
                    headers: {
                        Authorization: authToken,
                        'X-Experience-API-Version': '1.0.3',
                    },
                }));
                const more = statementResult.data.more;
                if (more.length > 0) {
                    const urlParts = service.baseUrl.split('/');
                    const newUrl = urlParts[0] + '//' + urlParts[1] + urlParts[2] + more;
                    const moreData = yield axios_1.default.get(newUrl, {
                        headers: {
                            Authorization: authToken,
                            'X-Experience-API-Version': '1.0.3',
                        },
                    });
                    if (moreData.data.statements.length != 0) {
                        const fullUrll = process.env.DEPLOY_URL + req.originalUrl;
                        searchParams.set('since', statementResult.data.statements[statementResult.data.statements.length - 1].timestamp);
                        searchParams.set('providerId', queryProviderId);
                        statementResult.data.more = fullUrll.split('?')[0] + '?' + searchParams.toString();
                        statementResult.data.lrs = service.displayName;
                    }
                }
                else if (more.length <= 0 && (services.length - 1) === providerIndex) {
                    statementResult.data.more = '';
                }
                else if (more.length <= 0 && (services.length - 1) !== providerIndex) {
                    const fullUrll = process.env.DEPLOY_URL + req.originalUrl;
                    const nextProvider = services[providerIndex + 1];
                    searchParams.set('all_providerIds', "true");
                    searchParams.set('providerId', nextProvider._id);
                    statementResult.data.more = fullUrll.split('?')[0] + '?' + searchParams.toString();
                }
                if (req.query.hashStatements)
                    this.hashStatements(statementResult.data.statements);
                return res.json(statementResult.data);
            }
            catch (err) {
                if (err.isAxiosError === true)
                    return next({ message: err, status: err.response.status });
                return next(err);
            }
        });
    }
    postTraceData() {
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const services = (yield clm_ext_service_providers_1.spBDTOInstance.findAll())
                .filter((item) => item.type === 'LRS');
            if (req.query.providerId != null) {
                const statements = Array.isArray(req.body) ? req.body : [req.body]; // array
                if (statements.length < 0)
                    return next({ message: 'Invalid Statement', status: 400 });
                const specificLRS = services.find((item) => item._id === req.query.providerId);
                if (!specificLRS)
                    return next({ message: `Not found provider with that id: ${req.query.providerId}`, status: 404 });
                const data = yield this.sendToSpecificLRS(statements, specificLRS, res);
                return res.json(data);
            }
            else {
                try {
                    const statementsArr = [];
                    const statements = Array.isArray(req.body) ? req.body : [req.body]; // array
                    if (statements.length < 0)
                        return next({ message: 'Invalid Statement', status: 400 });
                    let actor = (_c = (_b = (_a = statements[0]) === null || _a === void 0 ? void 0 : _a.actor) === null || _b === void 0 ? void 0 : _b.mbox) === null || _c === void 0 ? void 0 : _c.split('mailto:')[1];
                    const lrss = (yield clm_ext_service_providers_1.spRelationBDTOInstance.getUsersServices(actor)).filter((item) => item.type === 'LRS');
                    for (const lrs of lrss) {
                        const data = yield this.sendToSpecificLRS(statements, lrs, res);
                        statementsArr.push(data);
                    }
                    return res.json(statementsArr.flat(100));
                }
                catch (err) {
                    if (err.isAxiosError)
                        return next({ message: err, status: err.response.status });
                    return next(err);
                }
            }
        });
    }
    hashStatements(statements) {
        for (const statement of statements) {
            for (let prop in statement) {
                if (typeof statement[prop] === 'object') {
                    for (let objProp in statement[prop]) {
                        if (objProp === 'mbox') {
                            statement[prop]['mbox_sha1sum'] = (0, sha1_1.default)(statement[prop][objProp]);
                        }
                        if (statement[prop][objProp] !== 'Agent')
                            delete statement[prop][objProp];
                    }
                }
            }
        }
    }
    sendToSpecificLRS(statements, lrs, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let newStatements = JSON.parse(JSON.stringify(statements));
            let { username, password, baseUrl } = lrs;
            if (!baseUrl.includes('statements'))
                baseUrl = baseUrl + '/statements';
            const authToken = `Basic ${(0, btoa_1.default)(`${username}:${password}`)}`;
            for (const statement of newStatements) {
                for (let prop in statement.actor) {
                    if (prop === 'mbox')
                        statement.actor['mbox_sha1sum'] = get_hash(statement.actor[prop]);
                    delete statement.actor[prop];
                }
            }
            return yield this.postStatements(authToken, newStatements, baseUrl, res);
        });
    }
    postStatements(token, statement, lrsEndpoint, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield axios_1.default.post(lrsEndpoint, statement, {
                    headers: {
                        authorization: token,
                        'X-Experience-API-Version': '1.0.0',
                    },
                });
                return result.data;
            }
            catch (error) {
                console.log({ error });
                res.status(400).send();
            }
        });
    }
}
const controller = new TraceDataController();
const baseLocation = process.env.BASE_PATH || 'traceData';
clm_core_1.SwaggerDefinition.addPath(`${baseLocation}`, {
    "get": {
        "description": "Supports Experience-API (xAPI) and CALIPER",
        "summary": "List trace data ",
        "externalDocs": {
            "description": "Experience API | Statement Resource | GET Statements",
            "url": "https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#213-get-statements"
        },
        parameters: [
            {
                "name": "providerId",
                "description": "ProviderId for client-side routing control",
                "in": "query"
            },
            {
                "name": "hashStatements",
                "description": "hashStatements for determining whether to hash or not",
                "in": "query"
            },
            {
                "name": "statementId",
                "description": "query statementId",
                "in": "query"
            },
            {
                "name": "voidedStatementId",
                "description": "query Voided Statements",
                "in": "query"
            },
            {
                "name": "agent",
                "description": "query agent",
                "in": "query"
            },
            {
                "name": "verb",
                "description": "query verb.",
                "in": "query"
            },
            {
                "name": "activity",
                "description": "query activity",
                "in": "query"
            },
            {
                "name": "registration",
                "description": "query registration.",
                "in": "query"
            },
            {
                "name": "related_activities",
                "description": "query related_acitivities",
                "in": "query"
            },
            {
                "name": "related_agents",
                "description": "query related_agents",
                "in": "query"
            },
            {
                "name": "since",
                "description": "querysince",
                "in": "query"
            },
            {
                "name": "until",
                "description": "query until",
                "in": "query"
            },
            {
                "name": "limit",
                "description": "query limit",
                "in": "query"
            },
            {
                "name": "format",
                "description": "query format",
                "in": "query"
            },
            {
                "name": "attachments",
                "description": "query attachments",
                "in": "query"
            },
            {
                "name": "ascending",
                "description": "query ascending",
                "in": "query"
            }
        ],
        "tags": [
            "pblc"
        ],
        "responses": {
            "200": {
                "description": "Succesfully got statement(s) to the LRS(s).",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "description": "Object containing the names of the lrss as key and as value their respective statement-ids",
                            "properties": {
                                "more": {
                                    "description": "",
                                    "example": "http://localhost:8010/xapi/learningobjects/statements?limit=1&ascending=true&since=2021-08-11T15%3A47%3A28.702Z",
                                    "type": "string"
                                },
                                "actor": {
                                    "description": "",
                                    "example": "name | sha1sum |homePage",
                                    "type": "string"
                                },
                                "verb": {
                                    "description": "",
                                    "example": "id",
                                    "type": "string"
                                },
                                "context": {
                                    "description": "",
                                    "example": "registration | extensions | contextActivities | category",
                                    "type": "string"
                                },
                                "object": {
                                    "description": "",
                                    "example": "id | objectType | definition",
                                    "type": "string"
                                },
                                "stored": {
                                    "description": "",
                                    "example": "2021-08-11T15:45:57.939Z",
                                    "type": "string"
                                },
                                "authority": {
                                    "description": "",
                                    "example": "objectType | name | mbox",
                                    "type": "string"
                                },
                                "version": {
                                    "description": "",
                                    "example": "1.0.0",
                                    "type": "string"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
});
controller.router.get('/', controller.getTraceData);
clm_core_1.SwaggerDefinition.addPath(`${baseLocation}`, {
    "post": {
        "description": "Supports Experience-API (xAPI) and CALIPER",
        "summary": "Create trace data",
        "externalDocs": {
            "description": "Experience API | Statement Resource | POST Statements",
            "url": "https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#212-post-statements"
        },
        "operationId": "createTraceData",
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "array",
                        "description": "xApi array",
                        "items": {
                            "type": "object",
                            "description": "xApi conformant statement to be sent to the lrs",
                            "properties": {
                                "actor": {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "example": "Sally Glider"
                                        },
                                        "mbox": {
                                            "description": "The plain text email address of the user. 'mailto:' must be placed in front of the email.",
                                            "example": "mailto:sally@example.com"
                                        }
                                    }
                                },
                                "verb": {
                                    "type": "object",
                                    "properties": {
                                        "id": {
                                            "example": "http://adlnet.gov/expapi/verbs/experienced"
                                        },
                                        "display": {
                                            "description": "the language displayed for the user",
                                            "type": "object",
                                            "example": {
                                                "en-US": "experienced"
                                            }
                                        }
                                    }
                                },
                                "object": {
                                    "type": "object",
                                    "properties": {
                                        "id": {
                                            "type": "string",
                                            "example": "https://learningmiddleware.fokus.fraunhofer.de/",
                                            "description": "The course-element-id should be placed on the last slash! Requirement of xAPI for id properties to be URI conformant."
                                        },
                                        "definition": {
                                            "type": "object",
                                            "properties": {
                                                "name": {
                                                    "type": "object",
                                                    "example": {
                                                        "en-US": "Solo Hang Gliding"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "parameters": [
            {
                "name": "providerId",
                "description": "ProviderId for client-side routing control",
                "in": "query",
                "required": false,
                "type": "string",
                "format": "uuid"
            }
        ],
        "tags": [
            "pblc"
        ],
        "responses": {
            "200": {
                "description": "Succesfully sent a statement to the LRS",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "description": "Array containing the statemnet-ids",
                            "items": {
                                "type": "string",
                                "description": "The statement-id of the fired statement",
                                "example": "IOJIJS838JJ9922929000111"
                            }
                        }
                    }
                }
            }
        }
    }
});
controller.router.post('/', controller.postTraceData());
controller.router.get('/swagger', (_, res) => res.json(clm_core_1.SwaggerDefinition.definition));
exports.default = controller;
