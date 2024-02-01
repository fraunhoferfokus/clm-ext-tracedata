
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const clm_core_1 = require("clm-core");
const cors_1 = __importDefault(require("cors"));
const EntryPointCtrl_1 = __importDefault(require("./src/controllers/EntryPointCtrl"));
const app = (0, express_1.default)();
const PORT = process.env.PORT;
const basePath = process.env.BASE_PATH || '/traceData';
const ECLUDED_PATHS = [
    `${basePath}/users/:id/courses/:id`,
    `${basePath}/swagger`,
];
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, uedbid, username, password, email, confirmPassword, userData, x-access-token, x-token-renewed, x-enrollment-key, x-api-key');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    next();
});
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use(clm_core_1.AuthGuard.requireAPIToken(ECLUDED_PATHS));
app.use(`${basePath}`, EntryPointCtrl_1.default.router);
app.use(clm_core_1.errHandler);
Promise.all([
    clm_core_1.pathBDTOInstance.registerRoutes(app, ECLUDED_PATHS)
]).then(() => {
    app.listen(PORT, () => {
        console.log("tracedata service");
    });
});
