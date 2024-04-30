import React from "react";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useReferralDetails } from "lib/hooks/useStripe";
import Link from "components/porter/Link";

function ReferralsPage(): JSX.Element {
    const { referralDetails } = useReferralDetails();
    const baseUrl = window.location.origin;

    return (
        <>
            <Text size={16}>Referrals</Text>
            <Spacer y={1} />
            <Text color="helper">
                Refer people to Porter to earn credits.
            </Text>
            <Spacer y={1} />
            {referralDetails !== null && (
                <>
                    <Text>
                        Your referral link is {" "}
                    </Text>
                    <Link to={baseUrl + "/register?referral=" + referralDetails.code}>{baseUrl + "/register?referral=" + referralDetails.code}</Link>
                    <Spacer y={1} />
                    <Text>You have referred {referralDetails.referral_count} users</Text>
                </>

            )}
            <Spacer y={1} />
        </>
    )
}

export default ReferralsPage;
