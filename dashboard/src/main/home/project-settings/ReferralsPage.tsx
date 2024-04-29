import React, { useContext } from "react";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { Context } from "shared/Context";
import Fieldset from "components/porter/Fieldset";

function ReferralsPage(): JSX.Element {


    return (
        <>
            <Text size={16}>Referrals</Text>
            <Spacer y={1} />
            <Text color="helper">
                Refer people to Porter to earn credits.
            </Text>
            <Spacer y={1} />
            <Text>
                Your referral code is {user?.referralCode}
            </Text>
            <Spacer y={1} />
        </>
    )
}

export default ReferralsPage;
