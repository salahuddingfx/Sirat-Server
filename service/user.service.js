const { prisma } = require("../config/db.config");

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { addresses: true },
  });
  if (user) delete user.password;
  return user;
};

const updateUserProfile = async (id, updateData) => {
  const { name, phone, username, avatar, addresses } = updateData;

  let updatePayload = {
    name,
    phone,
    username,
    avatar,
  };

  if (addresses && Array.isArray(addresses)) {
    // Update addresses: Delete all and recreate
    await prisma.address.deleteMany({ where: { userId: id } });
    updatePayload.addresses = {
      create: addresses.map((addr) => ({
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zipCode: addr.zipCode,
        country: addr.country || "Bangladesh",
        isDefault: addr.isDefault || false,
      })),
    };
  }

  const user = await prisma.user.update({
    where: { id },
    data: updatePayload,
    include: { addresses: true },
  });

  delete user.password;
  return user;
};

module.exports = { getUserById, updateUserProfile };