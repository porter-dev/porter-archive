import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import styled from "styled-components";
import Icon from "components/porter/Icon";
import editIcon from "assets/edit-button.svg"
import trashIcon from "assets/trash.png"

import { Context } from "shared/Context";
import BillingModal from "../modals/BillingModal";
import Button from "components/porter/Button";

function BillingPage() {
  const { user, currentProject } = useContext(Context);

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [shouldCreate, setShouldCreate] = useState(false);

  useEffect(() => {
    (async () => {
      await api.checkBillingCustomerExists("<token>", { user_email: user?.email }, { project_id: currentProject?.id })
      const listResponse = await api.listPaymentMethod("<token>", {}, { project_id: currentProject?.id })
      const paymentMethodList = listResponse.data === null ? [] : listResponse.data
      console.log(paymentMethodList)
      setPaymentMethods(paymentMethodList)
    })();
  }, []);

  if (shouldCreate) {
    return (
      <BillingModal
        onCreate={() => setShouldCreate(false)}
        back={() => setShouldCreate(false)}
        project_id={currentProject?.id}
      />
    );
  }

  const updatePaymentMethod = (paymentMethod) => {
    console.log('update')
    return (
      <BillingModal
        onCreate={() => setShouldCreate(false)}
        back={() => setShouldCreate(false)}
        defaultValues={paymentMethod}
        project_id={currentProject?.id}
      />
    )
  }

  const deletePaymentMethod = (paymentMethod) => {
    api.deletePaymentMethod("<token>", {}, { project_id: currentProject?.id, payment_method_id: paymentMethod.id })
  }

  return (
    <div style={{ height: "1000px" }}>
      <BillingModalWrapper>
        <Heading isAtTop={true}>Payment methods</Heading>
        <Helper>
          This displays all configured payment methods
        </Helper>
        <PaymentMethodListWrapper>
          {
            paymentMethods.map((paymentMethod, idx) => {
              return (
                <PaymentMethodContainer key={idx}>
                  <Container>
                    <PaymentMethodText>{paymentMethod.card.display_brand} {paymentMethod.card.last4}</PaymentMethodText>
                    <ButtonContainer>
                      <Button onClick={() => updatePaymentMethod(paymentMethod)}>
                        <Icon src={editIcon} height={"14px"} />
                      </Button>
                      <Button onClick={() => deletePaymentMethod(paymentMethod)}>
                        <Icon src={trashIcon} height={"14px"} />
                      </Button>
                    </ButtonContainer>
                  </Container>
                </PaymentMethodContainer>
              )
            })
          }
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
    padding: 5px;
    padding-left: 10px;
    display: block;
    width: 100%;
    border-radius: 5px;
    background: ${(props) => props.theme.fg};
    border: 1px solid ${({ theme }) => theme.border};
    margin-bottom: 10px;
    margin-top: 5px;
`;

const Container = styled.div`
  padding: 5px;
  display: flex;
  justify-content: space-around;
  align-items: center;
`;

const ButtonContainer = styled.div`
  width: 20%;
  padding: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PaymentMethodText = styled.span`
  font-size: 0.8em;
  margin-right: 5px;
`;