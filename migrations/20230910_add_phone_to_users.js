module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
      after: 'role'
    });

    // Add index for better query performance
    await queryInterface.addIndex('users', ['phone'], {
      unique: true,
      name: 'users_phone_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('users', 'users_phone_unique');
    await queryInterface.removeColumn('users', 'phone');
  }
};
