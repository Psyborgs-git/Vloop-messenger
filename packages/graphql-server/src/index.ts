import { ApolloServer } from 'apollo-server';
import { typeDefs } from './schema/typeDefs';
import { userResolvers } from './resolvers/userResolvers';

// In a real app, you would merge resolvers from different files
const resolvers = userResolvers;

const server = new ApolloServer({ typeDefs, resolvers });

// This would be the entry point to start the GraphQL server.
// In a real setup, you'd likely have a `start` script in the package.json
// that runs this file with ts-node or similar.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
