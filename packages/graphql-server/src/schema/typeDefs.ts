import { gql } from 'apollo-server';

export const typeDefs = gql`
  type User {
    id: ID!
    email: String
    name: String
    phoneNumber: String
    avatarUrl: String
    createdAt: String!
  }

  type Query {
    users: [User]
    user(id: ID!): User
  }

  input CreateUserInput {
    email: String
    name: String
    phoneNumber: String
  }

  input UpdateUserInput {
    email: String
    name: String
    phoneNumber: String
    avatarUrl: String
  }

  type Mutation {
    createUser(input: CreateUserInput!): User
    updateUser(id: ID!, input: UpdateUserInput!): User
    deleteUser(id: ID!): User
  }
`;
