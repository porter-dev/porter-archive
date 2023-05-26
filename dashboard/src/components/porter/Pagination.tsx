import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Container from "./Container";
import Text from "./Text";
import Button from "./Button";
import Spacer from "./Spacer";

type Props = {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
};

const Pagination: React.FC<Props> = ({
  page,
  setPage,
  totalPages,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Do something
  }, []);

  return (
    <Container row spaced>
      <Text color="helper">Viewing page {page} out of {totalPages}</Text>
      <Container row>
        <Button 
          onClick={() => setPage(page - 1)} 
          disabled={page === 1}
          height="20px"
          color="fg"
          withBorder
        >
          Previous
        </Button>
        <Spacer inline x={0.5} />
        <Button 
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
          height="20px"
          color="fg"
          withBorder
        >
          Next
        </Button>
      </Container>
    </Container>
  );
};

export default Pagination;

const StyledPagination = styled.div`
  width: 100%;
`;