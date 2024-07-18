import express from "express";
import morgan from "morgan";
import fileUpload from "express-fileupload";
import path from "path";
import bodyParser from "body-parser";

import cors from "cors";

import webpush from "web-push";

import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";

import { createRoles } from "./libs/initialSetup";
import usuarioRoute from "./routes/usuario.routes";
import companyRoute from "./routes/company.routes";
import brandRoute from "./routes/brand.routes";
import categoryRoute from "./routes/category.routes";
import wasteRoute from "./routes/waste.routes";
import gathererRoute from "./routes/gatherer.routes";
import subCategoriaRoute from "./routes/subcategory.routes";
import orderRoute from "./routes/order.routes";
import payRoute from "./routes/pay.routes";
import billRoute from "./routes/bill.routes";
import billCarnet from "./routes/carnet.routes";
import fileRoute from "./routes/image-upload-s3.routes";
import chatRoute from "./routes/chat.routes";

const app = express();
createRoles();

const directoryToServer = "recirculapp";

app.use(morgan("dev")); // Para ver las peticiones que se hacen al servidor en consola
// app.use(morgan("combined")); // Para ver las peticiones que se hacen al servidor en consola en formato JSON (para verlo en Postman)
app.use(cors());
app.use(express.json());

const vapidKeys = {
    "publicKey": "BNmQuH1iA6kLb9hwTR4s69u-nNUdNPAvJjPcqQWdndFcSGhauqiAqSsiE3WZUfexCaPMn51qMYlqMC0qJbCnpw8",
    "privateKey": "R6DIrGqbSxKPDv64veDAohvoRpKkO0jXGbei_rOCRM4"
};

webpush.setVapidDetails(
    'mailto: karce@web-informatica.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
)

const enviarNotificacion = (req, res) => {

    const pushSubscription = {
        endpoint: 'https://wns2-bl2p.notify.windows.com/w/?token=BQYAAABX6TAKjDY1dF7ucRfpz5f4XuK5pnAhpvV3YsdeSz31T5atedvfwpwWVvhkjLGwbiy64qxzHmGodqBtaKn99vgjr2mrCPXje1YU4l4P4FfIcQmkJZA4gogy767z0G1GcBhsStMZdDrgVGoIwpDm1RLvABCd7EIIuqVmre%2Fau9OFbzvbIs9aB28CSUr37S4CDlo56AM%2BCfGO%2FG4wn70rfamcvJX6AeKgJtf%2FA%2BHhRy8vdz%2F5vpsfmll9kM%2FK%2B5QnCVva%2F5ZsX49NiAtyhRQYCd5%2FnoIsXwx0YXs3jzVPaxcl0votgS5auc5yr7UyQzGxqsmty%2FoD5ldIJo81%2FJrYzN9Q',
        keys: {
            auth: 's55avDVEP2lDpUeEB2_csQ',
            p256dh: 'BHt_wLLxoYNadFbqp7nLCRiN36cKmA75Ec_0fPOUlrAGqpPDOfaQzfyq-Wcal05KFzRIx59WuXJLwzIY1C_za_A'
        }
    };

    const payload = {
        notification: {
            title: 'Recirculapp te informa 🤠',
            body: 'Esta es una notificacion 🚚',
            icon: 'https://recirculapp.com/wp-content/uploads/2021/09/logo-recirculapp-2021-480x480.jpg',
            image: 'https://recirculapp.com/wp-content/uploads/2021/09/logo-recirculapp-2021-480x480.jpg',
            vibrate: [100, 50, 100],
            actions: [{
                action: 'explore',
                title: 'Ir a la tienda',
                icon: 'https://recirculapp.com/wp-content/uploads/2021/09/logo-recirculapp-2021-480x480.jpg'
            }]
        }
    }

    webpush.sendNotification(pushSubscription, JSON.stringify(payload))
        .then(result => res.status(200).json(result))
        .catch(e => res.status(500).json(e))
}

Sentry.init({
    dsn: 'https://bf218c25e383c4db5a26cabbfa674b9e@o1204981.ingest.sentry.io/4506236314976256',
    integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Sentry.Integrations.Express({ app }),
        new ProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
});

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.post('/api/send-notification', enviarNotificacion);

app.use(fileUpload()); // Para subir archivos a la nube

app.use(bodyParser.urlencoded({ extended: false, limit: "50m" }));
app.use("/", express.static(path.join(__dirname, directoryToServer)));

app.get("/debug-sentry", function mainHandler(req, res) {
    throw new Error("My first Sentry error!");
});

app.use("/api/usuario", usuarioRoute);
app.use("/api/company", companyRoute);
app.use("/api/brand", brandRoute);
app.use("/api/category", categoryRoute);
app.use("/api/waste", wasteRoute);
app.use("/api/gatherer", gathererRoute);
app.use("/api/subcategories", subCategoriaRoute);
app.use("/api/order", orderRoute);
app.use("/api/pay", payRoute);
app.use("/api/file-upload", fileRoute);
app.use("/api/bill", billRoute);
app.use("/api/carnet", billCarnet);
app.use("/api/chat", chatRoute);

// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    res.statusCode = 500;
    res.end(res.sentry + "\n");
});

export default app;
