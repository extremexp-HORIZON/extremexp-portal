# ExtremeXP portal

## Run locally

1. Make sure that Docker is installed in your system and that the Docker deamon is running.
2. Start keycloak server first to configure it.

```bash
docker compose up keycloak
```

3. Once you notice "Keycloak ... started in ...", you can visit [the extremexp client in the extremxp realm](http://localhost:8080/admin/master/console/#/extremexp/clients/8274cd37-322a-4cbe-b822-ee64f5eb3ab6/settings). You will have to login with the credentials you specified (likely `admin`/`admin`).
4. Enable the `Authorization` setting an save. It's not enabled as the default settings cannot be imported automatically.
5. In the credentials tab, regenerate the client secret and copy it to the `OIDC_RP_CLIENT_SECRET` environment variable (for example in your `.env` file).
6. Start the other services.

```bash
docker compose up
```

7. Access the app via <http://localhost/>

## Rebuilding

```bash
docker compose build
```

## API not running on localhost?

To deploy the framework on a server with an IP that is not localhost, you need to change the `VITE_API_URL` for the frontend HTTP request in `web-app/.env`, and rebuild the frontend.

## Demo

**Network Deployment:**

![newtwork_structure](./demo_images/network_and_authentication.v1.png)

**Login**

![login](./demo_images/1.login.png)

**Dashboard:**

![dashboard experiments](./demo_images/2.dashboard-experiments-overview.png)
![dashboard experiments deletion](./demo_images/3.dashboard-experiments-deletion.png)
![dashboard tasks](./demo_images/4.dashboard-tasks-overview.png)

**Editor:**

![editor](./demo_images/6.editor-drag-to-add-composite-task.png)
![editor composite task editing](./demo_images/7.editor-composite-task-editing.png)
![editor label editing](./demo_images/8.editor-label-editing.png)
![editor task config panel](./demo_images/9.editor-task-config-panel-name-editing.png)
![editor task variant selection](./demo_images/10.editor-task-config-panel-variant-selection.png)
![editor add task variant](./demo_images/11.editor-task-config-panel-add-variant.png)
![editor model save](./demo_images/12.editor-model-save.png)
![editor model save as](./demo_images/13.editor-model-save-as.png)
