
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

import { BaseExtensionCtrl, relationBDTOInstance } from "clm-core"
import express from 'express'
import { spBDTOInstance, spRelationBDTOInstance } from "clm-ext-service_providers"
import axios from 'axios'
import btoa from 'btoa'
import sha1 from 'sha1'
import swaggerJsdoc from 'swagger-jsdoc'
import { ROOT_DIR } from "../../server"
/**
 * @openapi
 * components:
 *   schemas:
 *     relation:
 *       type: object
 *       properties:
 *         fromType:
 *           type: string
 *           description: The type of the node
 *           default: fromTypeNode
 *         toType:
 *           type: string
 *           description: The type of the target node
 *           default: toTypeNode
 *         fromId:
 *           type: string
 *           description: The id of the node
 *           default: fromNodeId
 *         toId:
 *           type: string
 *           description: The id of the target node
 *           default: toNodeId
 *         order:
 *           type: number
 *           description: The order of the relation. Used for example ordering the enrollments of a group/user
 *           default: 0
 *   parameters:
 *     accessToken:
 *       name: x-access-token
 *       in: header
 *       description: The access token
 *       required: true
 *       example: exampleAccessToken
 *       schema:
 *         type: string
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *     refreshAuth:
 *       type: apiKey
 *       in: header
 *       name: x-refresh-token
 */
const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CLM-EXT-Tools API',
            version: '1.0.0',
            description: 'API endpoints the clm-ext-tools module offers',
        },
        servers: [
            {
                "url": "{scheme}://{hostname}:{port}{path}",
                "description": "The production API server",
                "variables": {
                    "hostname": {
                        "default": "localhost",
                    },
                    "port": {
                        "default": `${process.env.PORT}`
                    },
                    "path": {
                        "default": ""
                    },
                    "scheme": {
                        "default": "http",
                    }
                }
            }
        ],
        security: [{
            bearerAuth: [],
        }]
    },
    apis: [
        './src/controllers/*.ts'
    ]
}
const swaggerSpecification = swaggerJsdoc(options)

const get_hash = (identifier: string, prop?: any) => {
    return sha1(identifier)
}

const profileJsonLd = require(ROOT_DIR + '/resources/profile_tripleadapt.v1_0.json')
const profileJsonLd2 = require(ROOT_DIR + '/resources/profile_tripleadapt.v1_1.json')

class TraceDataController extends BaseExtensionCtrl {

    getTraceData: express.Handler = async (req, res, next) => {

        try {
            const services = (await spBDTOInstance.findAll()).filter((item) => item.type === 'LRS')
            // return res.json(services)
            const queryProviderId = req.query.providerId ?? services[0]._id
            const providerIndex = services.findIndex((provider) => provider._id === queryProviderId)
            const service = services.find((item) => item._id === queryProviderId)
            if (!service) return next({ status: 400, message: `Provider with that id does not exist!:  ${queryProviderId}` })
            if (providerIndex < 0) return next({ status: 400, message: "provider with that id not found" })

            const authToken = `Basic ${btoa(
                `${service.username}:${service.password}`
            )}`; let fullUrl = service.baseUrl + '/statements';

            let searchParams;
            searchParams = new URLSearchParams(req.originalUrl.split('?')[1]);
            searchParams.delete('providerId');
            searchParams.delete('hashStatements')
            searchParams.set('ascending', 'true');
            fullUrl += '?' + searchParams.toString();
            let statementResult = (await axios.get(fullUrl, {
                headers: {
                    Authorization: authToken,
                    'X-Experience-API-Version': '1.0.3',
                },
            }))

            const more = statementResult.data.more


            if (more.length > 0) {
                const urlParts = service.baseUrl.split('/');
                const newUrl =
                    urlParts[0] + '//' + urlParts[1] + urlParts[2] + more;
                const moreData = await axios.get(newUrl, {
                    headers: {
                        Authorization: authToken,
                        'X-Experience-API-Version': '1.0.3',
                    },
                });

                if (moreData.data.statements.length != 0) {
                    const fullUrll = process.env.DEPLOY_URL + req.originalUrl;
                    searchParams.set('since', statementResult.data.statements[statementResult.data.statements.length - 1].timestamp);
                    searchParams.set('providerId', queryProviderId as string);
                    statementResult.data.more = fullUrll.split('?')[0] + '?' + searchParams.toString();
                    statementResult.data.lrs = service.displayName
                }
            } else if (more.length <= 0 && (services.length - 1) === providerIndex) {
                statementResult.data.more = ''
            } else if (more.length <= 0 && (services.length - 1) !== providerIndex) {
                const fullUrll = process.env.DEPLOY_URL + req.originalUrl;
                const nextProvider = services[providerIndex + 1]
                searchParams.set('all_providerIds', "true");
                searchParams.set('providerId', nextProvider._id);
                statementResult.data.more = fullUrll.split('?')[0] + '?' + searchParams.toString();
            }

            if (req.query.hashStatements) this.hashStatements(statementResult.data.statements)
            return res.json(statementResult.data)
        } catch (err: any) {
            if (err.isAxiosError === true) return next({ message: err, status: err.response.status });
            return next(err)
        }
    }

    postTraceData(): express.Handler {
        return async (req, res, next) => {

            const services = (await spBDTOInstance.findAll())
                .filter((item) => item.type === 'LRS')


            if (req.query.providerId != null) {
                const statements = Array.isArray(req.body) ? req.body : [req.body]; // array
                if (statements.length < 0)
                    return next({ message: 'Invalid Statement', status: 400 });

                const specificLRS = services.find((item) => item._id === req.query.providerId)
                if (!specificLRS) return next({ message: `Not found provider with that id: ${req.query.providerId}`, status: 404 })
                const data = await this.sendToSpecificLRS(
                    statements,
                    specificLRS,
                    res
                );
                return res.json(data);
            } else {
                try {
                    const statementsArr = []
                    const statements = Array.isArray(req.body) ? req.body : [req.body]; // array
                    if (statements.length < 0)
                        return next({ message: 'Invalid Statement', status: 400 });



                    let actor = statements[0]?.actor?.mbox?.split('mailto:')[1]
                    const lrss = (await spRelationBDTOInstance.getUsersServices(actor)).filter((item) => item.type === 'LRS')

                    for (const lrs of lrss) {
                        const data = await this.sendToSpecificLRS(
                            statements,
                            lrs,
                            res
                        );
                        statementsArr.push(data)
                    }

                    return res.json(statementsArr.flat(100))
                } catch (err: any) {
                    if (err.isAxiosError) return next({ message: err, status: err.response.status });
                    return next(err)
                }
            }
        }
    }

    hashStatements(statements: any) {
        for (const statement of statements) {
            for (let prop in statement) {
                if (typeof statement[prop] === 'object') {
                    for (let objProp in statement[prop]) {
                        if (objProp === 'mbox') {
                            statement[prop]['mbox_sha1sum'] = sha1(statement[prop][objProp])
                        }
                        if (statement[prop][objProp] !== 'Agent') delete statement[prop][objProp]
                    }
                }
            }
        }

    }

    private async sendToSpecificLRS(statements: any[], lrs: any, res: express.Response) {
        let newStatements = JSON.parse(JSON.stringify(statements))
        let { username, password, baseUrl } = lrs;

        if (!baseUrl.includes('statements'))
            baseUrl = baseUrl + '/statements';
        const authToken = `Basic ${btoa(`${username}:${password}`)}`;
        for (const statement of newStatements) {
            for (let prop in statement.actor) {
                if (prop === 'mbox')
                    statement.actor['mbox_sha1sum'] = get_hash(
                        statement.actor[prop]
                    );
                delete statement.actor[prop];
            }
        }
        return await this.postStatements(authToken, newStatements, baseUrl, res);

    }


    private async postStatements(token: string, statement: any[], lrsEndpoint: string, res: express.Response) {
        try {
            const result = await axios.post(lrsEndpoint, statement, {
                headers: {
                    authorization: token,
                    'X-Experience-API-Version': '1.0.0',
                },
            });
            return result.data;
        } catch (error: any) {
            console.log({ error })
            res.status(400).send();
        }
    }

    getInfo: express.Handler = (req, res, next) => {
        try {
            let version = req.params.version
            console.log(version)

            let profile;
            if (version === 'v1p1') {
                console.log('here')
                profile = profileJsonLd2
            } else {
                profile = profileJsonLd
            }

            return res.json(profile)
        } catch (err) {
            return next(err)
        }
    }



}

const controller = new TraceDataController()

const baseLocation = process.env.BASE_PATH || 'traceData'

/**
 * @openapi
 * /traceData:
 *   get:
 *     description: Supports Experience-API (xAPI) and CALIPER
 *     summary: List trace data
 *     externalDocs:
 *       description: Experience API | Statement Resource | GET Statements
 *       url: https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#213-get-statements
 *     tags:
 *       - pblc
 *     parameters:
 *       - name: providerId
 *         description: ProviderId for client-side routing control
 *         in: query
 *         required: false
 *         schema:
 *          type: string
 *     responses:
 *       200:
 *         description: Succesfully got statement(s) to the LRS(s).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Object containing the names of the lrss as key and as value their respective statement-ids
 *               properties:
 *                 more:
 *                   type: string
 *                   example: "http://localhost:8010/xapi/learningobjects/statements?limit=1&ascending=true&since=2021-08-11T15%3A47%3A28.702Z"
 */
controller.router.get('/', controller.getTraceData)

/**
 * @openapi
 * /traceData:
 *   post:
 *     description: Supports Experience-API (xAPI) and CALIPER
 *     summary: Create trace data
 *     externalDocs:
 *       description: Experience API | Statement Resource | POST Statements
 *       url: https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#212-post-statements
 *     operationId: createTraceData
 *     tags:
 *       - pblc
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             description: xApi array
 *             items:
 *               type: object
 *               description: xApi conformant statement to be sent to the lrs
 *               properties:
 *                 actor:
 *                   type: object
 *                   properties:
 *                     name:
 *                       example: Sally Glider
 *                     mbox:
 *                       description: The plain text email address of the user. 'mailto:' must be placed in front of the email.
 *                       example: "mailto:sally@example.com"
 *     parameters:
 *       - name: providerId
 *         description: ProviderId for client-side routing control
 *         in: query
 *         required: false
 *         schema:
 *              type: string
 *     responses:
 *       200:
 *         description: Succesfully sent a statement to the LRS
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               description: Array containing the statemnet-ids
 *               items:
 *                 type: string
 *                 description: The statement-id of the fired statement
 *                 example: "IOJIJS838JJ9922929000111"
 */
controller.router.post('/', controller.postTraceData())




// SwaggerDefinition.addPath(`${baseLocation}/profiles/{version}`,

//     {
//         "get": {
//             "description": "Supports Experience-API (xAPI) and CALIPER",
//             "summary": "Get profile information",
//             "externalDocs": {
//                 "description": "Experience API | Statement Resource | POST Statements",
//                 "url": "https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#212-post-statements"
//             },
//             parameters: [
//                 {
//                     "in": "path",
//                     "schema": {
//                         type: "string"
//                     },
//                     name: "version",
//                     enum: ['v1p0', 'v1p1'],
//                     default: "v1p1"
//                 }
//             ]
//             // "operationId": "createTraceData",
//             // "requestBody": {
//             //     "content": {
//             //         "application/json": {
//             //             "schema": {
//             //                 "type": "array",
//             //                 "description": "xApi array",
//             //                 "items": {
//             //                     "type": "object",
//             //                     "description": "xApi conformant statement to be sent to the lrs",
//             //                     "properties": {
//             //                         "actor": {
//             //                             "type": "object",
//             //                             "properties": {
//             //                                 "name": {
//             //                                     "example": "Sally Glider"
//             //                                 },
//             //                                 "mbox": {
//             //                                     "description": "The plain text email address of the user. 'mailto:' must be placed in front of the email.",
//             //                                     "example": "mailto:sally@example.com"
//             //                                 }
//             //                             }
//             //                         },
//             //                         "verb": {
//             //                             "type": "object",
//             //                             "properties": {
//             //                                 "id": {
//             //                                     "example": "http://adlnet.gov/expapi/verbs/experienced"
//             //                                 },
//             //                                 "display": {
//             //                                     "description": "the language displayed for the user",
//             //                                     "type": "object",
//             //                                     "example": {
//             //                                         "en-US": "experienced"
//             //                                     }
//             //                                 }
//             //                             }
//             //                         },
//             //                         "object": {
//             //                             "type": "object",
//             //                             "properties": {
//             //                                 "id": {
//             //                                     "type": "string",
//             //                                     "example": "https://learningmiddleware.fokus.fraunhofer.de/",
//             //                                     "description": "The course-element-id should be placed on the last slash! Requirement of xAPI for id properties to be URI conformant."
//             //                                 },
//             //                                 "definition": {
//             //                                     "type": "object",
//             //                                     "properties": {
//             //                                         "name": {
//             //                                             "type": "object",
//             //                                             "example": {
//             //                                                 "en-US": "Solo Hang Gliding"
//             //                                             }
//             //                                         }
//             //                                     }
//             //                                 }
//             //                             }
//             //                         }
//             //                     }
//             //                 }
//             //             }
//             //         }
//             //     }
//             // },
//             // "parameters": [
//             //     {
//             //         "name": "providerId",
//             //         "description": "ProviderId for client-side routing control",
//             //         "in": "query",
//             //         "required": false,
//             //         "type": "string",
//             //         "format": "uuid"
//             //     }
//             // ],
//             ,
//             "tags": [
//                 "pblc"
//             ],
//             "responses": {
//                 "200": {
//                     "description": "Succesfully sent a statement to the LRS",
//                     "content": {
//                         "application/json": {
//                             "schema": {
//                                 "$ref": "#/components/schemas/jsonld",

//                             }
//                         }
//                     }
//                 }
//             }
//         }
//     }

// )
controller.router.get('/profiles/:version', controller.getInfo)
// controller.router.get('/profiles/v1p1', controller.getInfo)



controller.router.get('/swagger', (_, res) => {
    return res.json(swaggerSpecification)
})


export default controller;

