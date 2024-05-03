import {Identity, type LoginFlow, type UpdateLoginFlowBody} from "@ory/client"
import { UserAuthCard } from "@ory/elements"
import React, {useCallback, useEffect, useState} from "react"
import { useHistory } from "react-router-dom"
import { useLocation } from "react-router";
import {basePath, sdk, sdkError} from "shared/auth/sdk"
import api from "../../shared/api";
import styled from "styled-components";
import Loading from "../../components/Loading";

/**
 * Login is a React component that renders the login form using Ory Elements.
 * It is used to handle the login flow for a variety of authentication methods
 * and authentication levels (e.g. Single-Factor and Two-Factor)
 *
 * The Login component also handles the OAuth2 login flow (as an OAuth2 provider)
 * For more information regarding OAuth2 login, please see the following documentation:
 * https://www.ory.sh/docs/oauth2-oidc/custom-login-consent/flow
 *
 */
type Props = {
    authenticate: () => Promise<void>;
};

const OryLogin: React.FC<Props> = ({ authenticate }): JSX.Element => {
    const [flow, setFlow] = useState<LoginFlow | null>(null)

    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);

    // The aal is set as a query parameter by your Ory project
    // aal1 is the default authentication level (Single-Factor)
    // aal2 is a query parameter that can be used to request Two-Factor authentication
    // https://www.ory.sh/docs/kratos/mfa/overview
    const aal2 = queryParams.get("aal2")

    // The login_challenge is a query parameter set by the Ory OAuth2 login flow
    // Switching between pages should keep the login_challenge in the URL so that the
    // OAuth flow can be completed upon completion of another flow (e.g. Registration).
    // https://www.ory.sh/docs/oauth2-oidc/custom-login-consent/flow
    const loginChallenge = queryParams.get("login_challenge")

    // The return_to is a query parameter is set by you when you would like to redirect
    // the user back to a specific URL after login is successful
    // In most cases it is not necessary to set a return_to if the UI business logic is
    // handled by the SPA.
    //
    // In OAuth flows this value might be ignored in favor of keeping the OAuth flow
    // intact between multiple flows (e.g. Login -> Recovery -> Settings -> OAuth2 Consent)
    // https://www.ory.sh/docs/oauth2-oidc/identity-provider-integration-settings
    const returnTo = queryParams.get("return_to")

    const history = useHistory()

    // Get the flow based on the flowId in the URL (.e.g redirect to this page after flow initialized)
    const getFlow = useCallback(
        (flowId: string) =>
            sdk
                // the flow data contains the form fields, error messages and csrf token
                .getLoginFlow({ id: flowId })
                .then(({ data: flow }) => setFlow(flow))
                .catch(sdkErrorHandler),
        [],
    )

    // initialize the sdkError for generic handling of errors
    const sdkErrorHandler = sdkError(getFlow, setFlow, "/login", true)

    // Create a new login flow
    const createFlow = () => {
        sdk
            .createBrowserLoginFlow({
                refresh: true,
                aal: aal2 ? "aal2" : "aal1",
                ...(loginChallenge && { loginChallenge: loginChallenge }),
                ...(returnTo && { returnTo: returnTo }),
            })
            // flow contains the form fields and csrf token
            .then(({ data: flow }) => {
                // Update URI query params to include flow id
                queryParams.set("flow", flow.id)
                // Set the flow data
                setFlow(flow)
            })
            .catch(sdkErrorHandler)
    }

    const registerPorterUser = (identity: Identity): void => {
        api
            .registerUser("", {
                email: identity.traits?.email || "",
                password: "",
                first_name: identity.traits?.name || "",
                last_name: "",
                company_name: "",
                referral_method: "",
                auth_provider: "ory",
                external_id: identity.id || "",
            }, {})
            .then(() => {
                // add user to context here
                console.log("User registered")
                authenticate().catch(() => {});

            })
            .catch((err) => {
                console.error(err)
            })
    }

    // submit the login form data to Ory
    const submitFlow = (body: UpdateLoginFlowBody): void => {
        // something unexpected went wrong and the flow was not set
        if (!flow) {
            history.push("/login", { replace: true })
            return
        }

        // we submit the flow to Ory with the form data
        sdk
            .updateLoginFlow({ flow: flow.id, updateLoginFlowBody: body })
            .then((resp) => {

                if (resp?.data?.session?.identity) {
                    registerPorterUser(resp.data.session.identity)
                }
                // we successfully submitted the login flow, so reauthenticate and lets redirect to the dashboard
                history.push("/", { replace: true })
            })
            .catch(sdkErrorHandler)

    }

    useEffect(() => {
        // we might redirect to this page after the flow is initialized, so we check for the flowId in the URL
        const flowId = queryParams.get("flow")
        // the flow already exists
        if (flowId) {
            getFlow(flowId).catch(createFlow) // if for some reason the flow has expired, we need to get a new one
            return
        }

        // we assume there was no flow, so we create a new one
        createFlow()
    }, [])

    // we check if the flow is set, if not we show a loading indicator
    return flow ? (
        // we render the login form using Ory Elements
        <Scrollable>

        <UserAuthCard
            title={""}
            flowType={"login"}
            // we always need the flow data which populates the form fields and error messages dynamically
            flow={flow}
            // the login card should allow the user to go to the registration page and the recovery page
            additionalProps={{
                forgotPasswordURL: {
                    handler: () => {
                        const search = new URLSearchParams()
                        flow.return_to && search.set("return_to", flow.return_to)
                        window.location.replace(`${basePath}/ui/recovery?${search.toString()}`)
                    },
                },
                signupURL: {
                    handler: () => {
                        const search = new URLSearchParams()
                        flow.return_to && search.set("return_to", flow.return_to)
                        flow.oauth2_login_challenge &&
                        search.set("login_challenge", flow.oauth2_login_challenge)
                        window.location.replace(`${basePath}/ui/registration?${search.toString()}`)
                    },
                },
            }}
            // we might need webauthn support which requires additional js
            includeScripts={true}
            // we submit the form data to Ory
            onSubmit={({ body }) => submitFlow(body as UpdateLoginFlowBody)}
        />
        </Scrollable>
    ) : (
        <Loading/>
    )
}



export default OryLogin;



            const Scrollable = styled.div`
            height: 80vh;
            width: 80vh;
            overflow: auto;
            `;