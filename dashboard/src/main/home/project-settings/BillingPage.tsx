import React, { useContext, useState } from "react";
import styled from "styled-components";

import Heading from "components/form-components/Heading";
import Loading from "components/Loading";
import Icon from "components/porter/Icon";
import Text from "components/porter/Text";
import SaveButton from "components/SaveButton";
import { usePaymentMethods } from "lib/hooks/useStripe";

import { Context } from "shared/Context";
import cardIcon from "assets/credit-card.svg";
import trashIcon from "assets/trash.png";

import BillingModal from "../modals/BillingModal";
import BillingDeleteConsent from "./BillingDeleteConsent";

function BillingPage() {
  const { currentProject } = useContext(Context);
  const [showBillingDeleteModal, setShowBillingDeleteModal] = useState(false);
  const [shouldCreate, setShouldCreate] = useState(false);
  const {
    paymentMethodList,
    refetchPaymentMethods,
    deletePaymentMethod,
    isDeleting,
  } = usePaymentMethods();

  const onCreate = async () => {
    setShouldCreate(false);
    refetchPaymentMethods();
  };

  if (shouldCreate) {
    return (
      <BillingModal
        onCreate={onCreate}
        back={() => setShouldCreate(false)}
        project_id={currentProject?.id}
      />
    );
  }

  return (
    <div style={{ height: "1000px" }}>
      <BillingModalWrapper>
        <Heading isAtTop={true}>Payment methods</Heading>
        <Text>This displays all configured payment methods</Text>
        <PaymentMethodListWrapper>
          {paymentMethodList.map((paymentMethod, idx) => {
            return (
              <PaymentMethodContainer key={idx}>
                <Container>
                  <Icon src={cardIcon} height={"14px"} />
                  <PaymentMethodText>
                    **** **** **** {paymentMethod.last4}
                  </PaymentMethodText>
                  <ExpirationText>
                    Expires: {paymentMethod.exp_month}/{paymentMethod.exp_year}
                  </ExpirationText>
                  <DeleteButtonContainer>
                    {isDeleting ? (
                      <Loading />
                    ) : (
                      <DeleteButton
                        onClick={() => setShowBillingDeleteModal(true)}
                      >
                        <Icon src={trashIcon} height={"14px"} />
                      </DeleteButton>
                    )}
                  </DeleteButtonContainer>
                  <BillingDeleteConsent
                    setShowModal={setShowBillingDeleteModal}
                    show={showBillingDeleteModal}
                    onDelete={() => deletePaymentMethod(paymentMethod.id)}
                  />
                </Container>
              </PaymentMethodContainer>
            );
          })}
        </PaymentMethodListWrapper>
        <SaveButtonContainer>
          <SaveButton
            makeFlush={true}
            clearPosition={true}
            onClick={() => setShouldCreate(true)}
          >
            <i className="material-icons">add</i>
            Add Payment Method
          </SaveButton>
        </SaveButtonContainer>
      </BillingModalWrapper>
    </div>
  );
}

export default BillingPage;

const PaymentMethodListWrapper = styled.div`
  width: 100%;
  max-height: 500px;
  overflow-y: auto;
`;

const BillingModalWrapper = styled.div`
  width: 60%;
  min-width: 600px;
`;

const SaveButtonContainer = styled.div`
  position: relative;
  margin-top: 20px;
`;

const PaymentMethodContainer = styled.div`
  color: #aaaabb;
  border-radius: 5px;
  padding: 10px;
  display: block;
  width: 100%;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid ${({ theme }) => theme.border};
  margin-bottom: 10px;
  margin-top: 10px;
`;

const Container = styled.div`
  padding: 5px;
  display: flex;
  justify-content: space-around;
  align-items: center;
`;

const PaymentMethodText = styled.span`
  font-size: 0.8em;
  margin-right: 5px;
`;

const ExpirationText = styled.span`
  font-size: 0.8em;
  margin-right: 5px;
`;

const DeleteButton = styled.div`
  cursor: pointer;
`;

const DeleteButtonContainer = styled.div`
  text-align: center;
`;
