
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
import dotenv from 'dotenv'
dotenv.config()
export const ROOT_DIR = process.cwd()
import express from 'express'
import { AuthGuard, pathBDTOInstance, errHandler } from "clm-core"
import cors from 'cors'
import EntryPointCtrl from './src/controllers/EntryPointCtrl'
import path from 'path'



const app = express()
const PORT = process.env.PORT

const basePath = process.env.BASE_PATH || '/traceData';
const ECLUDED_PATHS = [
    `${basePath}/users/:id/courses/:id`,
    `${basePath}/swagger`,
    `${basePath}/profiles/v1p0`,
    `${basePath}/profiles/v1p1`,
]

app.use(function (req, res, next) {
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token, x-token-renewed, x-api-key'
    );
    res.header(
        'Access-Control-Allow-Methods',
        'GET,PUT,POST,DELETE,PATCH,OPTIONS'
    );
    next();
});

app.use(express.json())

app.use(cors())

app.get('/health', (req, res) => {
    res.send('OK')
})

app.use(AuthGuard.requireAPIToken(ECLUDED_PATHS))

app.use(`${basePath}`, EntryPointCtrl.router)
app.use(errHandler);

Promise.all([
    pathBDTOInstance.registerRoutes(app, ECLUDED_PATHS)
]).then(() => {
    app.listen(PORT, () => {
        console.log("tracedata service")
    })
})
