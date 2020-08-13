import thisCall from './thisCall';

interface Mock {
  thisCall: typeof thisCall;
}

const mock: Mock = {
  thisCall,
};

export default mock;
