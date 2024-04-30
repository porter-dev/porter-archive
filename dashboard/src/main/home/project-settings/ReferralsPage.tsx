import React from "react";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useClaimReferralReward, useReferralDetails, useReferrals } from "lib/hooks/useStripe";
import Button from "components/porter/Button";
import Link from "components/porter/Link";

function ReferralsPage(): JSX.Element {
    const referralRewardRequirement = 5;
    const { referralDetails } = useReferralDetails();
    const { referralsCount } = useReferrals();
    const claimReferralReward = useClaimReferralReward();
    const baseUrl = window.location.origin;

    const eligibleForReward = (): boolean => {
        if (referralsCount === null) {
            return false;
        }

        return referralsCount >= referralRewardRequirement;
    }

    const claimReward = (): void => {
        claimReferralReward();
    }

    const displayReferral = (): JSX.Element => {
        if (referralDetails === null || referralsCount === null) {
            return <></>
        }

        if (!eligibleForReward()) {
            return (
                <>
                    <Text>
                        Refer {referralRewardRequirement - referralsCount} more people to earn a reward.
                    </Text>
                    <Spacer y={1} />
                </>
            )
        }

        if (referralDetails?.reward_claimed) {
            return (
                <>
                    <Text>
                        You have already claimed a reward for referring people to Porter.
                    </Text>
                    <Spacer y={1} />
                </>
            )
        }

        return (
            <>
                <Text>You are elegible for claiming a reward on this project.</Text>
                <Spacer y={0.5} />
                <Button onClick={claimReward}>Claim Reward</Button>
            </>
        )
    }

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
                </>

            )}
            <Spacer y={1} />
            {displayReferral()}
            <Spacer y={1} />
        </>
    )
}

export default ReferralsPage;
