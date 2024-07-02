// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

contract Magang {
    address public owner;
    mapping(address => bool) is_login;
    mapping(address => string) role;
    mapping(address => bool) is_registered;
    mapping(address => string) public name;
    mapping(string => string[]) public _permission;

    PermissionStruct[] permissionStruct;
    ProfileStruct[] users;

    constructor() {
        owner = msg.sender;
        string[] memory roles = Role;
        PermissionStruct memory _permissionRole;
        for (uint256 i = 0; i < roles.length; i++) {
            for (uint256 j = 0; j < permission.length; j++) {
                if ( keccak256(abi.encodePacked(roles[i])) == keccak256(abi.encodePacked("PETANI"))) {
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("write"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("read"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("transfer"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                }

                if (
                    keccak256(abi.encodePacked(roles[i])) == keccak256(abi.encodePacked("PENGOLAH")) 
                    || keccak256(abi.encodePacked(roles[i])) == keccak256(abi.encodePacked("PENGEKSPOR"))
                    || keccak256(abi.encodePacked(roles[i])) == keccak256(abi.encodePacked("IMPORTIR")) 
                    ||  keccak256(abi.encodePacked(roles[i])) == keccak256(abi.encodePacked("DISTRIBUTOR")) 
                    ||  keccak256(abi.encodePacked(roles[i])) == keccak256(abi.encodePacked("RETAILER")) 
                ) {
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("update"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("read"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("confirmation"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("transfer"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("delete"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                }
                if (
                      keccak256(abi.encodePacked(roles[i])) == keccak256(abi.encodePacked("KONSUMEN")) 
                ) {
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("update"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("read"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                    if (
                        keccak256(abi.encodePacked(permission[j])) ==
                        keccak256(abi.encodePacked("confirmation"))
                    ) {
                        _permission[roles[i]].push(permission[j]);
                    }
                }
            }
            _permissionRole.name = roles[i];
            _permissionRole.permission = _permission[roles[i]];
            permissionStruct.push(_permissionRole);
        }
    }

    struct PermissionStruct {
        string name;
        string[] permission;
    }

    string[] permission = [
        "write",
        "delete",
        "update",
        "read",
        "transfer",
        "confirmation"
    ];

    struct ProfileStruct {
        address id;
        bool is_login;
        string role;
        string name;
    }

    struct ProductStruct {
        string id;
        address owner;
        address created_by;
        string status;
        string metadata;
        uint created_at;
    }

    mapping(address => ProfileStruct) public profile;
    mapping(address => ProductStruct[]) public products;

    event registerAction(
        address owner,
        string role,
        string name,
        uint created_at
    );

    event userInteraction(
        address owner,
        string action,
        string name,
        uint created_at
    );

    event productTransaction(
        address owner,
        address to,
        string product_id,
        string  metadata,
        string status,
        string note,
        uint created_at
    );

    event logginEvent(address owner, bytes32 desciription, uint256 created_at);

    string[] Role = ["PETANI","PENGOLAH", "PENGEKSPOR","IMPORTIR","DISTRIBUTOR","RETAILER","KONSUMEN"];

    function checkLoginStatus(address user_id) external view returns (bool) {
        if (!is_login[user_id]) return false;
        return true;
    }

    function checkRegisterStatus(address user_id) external view returns (bool) {
        return is_registered[user_id];
    }

    function login() external returns (bool) {
        // if(!is_registered[msg.sender]) return false;
        require(is_registered[msg.sender], "User must be registered first");
        is_login[msg.sender] = true;
        this.changeUserStatus(msg.sender);
        return true;
    }

    function changeUserStatus(address _id) external {
        ProfileStruct memory user_profile = profile[_id];
        user_profile.id = _id;
        user_profile.role = role[_id];
        user_profile.name = name[_id];
        user_profile.is_login = is_login[_id];
        profile[_id] = user_profile;

        emit logginEvent(_id, "Change user status", block.timestamp);
    }

    function register(string memory _name, string memory _role)
        external
        returns (bool)
    {
        uint256 is_exists_role = 0;
        for (uint256 i = 0; i < Role.length; i++) {
            if (
                keccak256(abi.encodePacked(Role[i])) ==
                keccak256(abi.encodePacked(_role))
            ) {
                is_exists_role++;
            }
        }

        require(is_exists_role != 0, "Invalid role");
        is_registered[msg.sender] = true;
        is_login[msg.sender] = true;
        name[msg.sender] = _name;
        role[msg.sender] = _role;
        this.changeUserStatus(msg.sender);

        emit registerAction(msg.sender, _role, _name, block.timestamp);
        // emit userInteraction(msg.sender, "REGISTER", _name, block.timestamp);
        ProfileStruct memory _profile;

        _profile.id = msg.sender;
        _profile.is_login = true;
        _profile.name = _name;
        _profile.role = _role;
        users.push(_profile);
        return true;
    }

    function profileInformation(address _id)
        external
        view
        returns (ProfileStruct memory)
    {
        // require(is_login[msg.sender], "You must login first");
        return profile[_id];
    }

    function createProduct(string memory _id, string memory metadata)
        external
        returns (bool)
    {
        ProductStruct memory _product;
        _product.owner = msg.sender;
        _product.created_by = msg.sender;
        _product.metadata = metadata;
        _product.status = "CREATED";
        _product.created_at = block.timestamp;
        _product.id = _id;
        products[msg.sender].push(_product);
        return true;
    }

    function getListProducts(address _id)
        external
        view
        returns (ProductStruct[] memory)
    {
        return products[_id];
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function getAllRoles() external view returns (PermissionStruct[] memory) {


        return permissionStruct;

    }

    function getPermissionByName(string memory _name)
        external
        view
        returns (string[] memory)
    {
        return _permission[_name];
    }

    function getUsers() external view returns (ProfileStruct[] memory) {
        return users;
    }

    function sendProduct(
        address to,
        string memory product_id,
        string memory note,
        string memory metadata
    ) external returns (bool) {
        ProductStruct memory _product;

        for (uint256 i = 0; i < products[to].length; i++) {
            if (
                bytes32(abi.encodePacked(products[to][i].id)) ==
                bytes32(abi.encodePacked(product_id))
            ) {
                return true;
            }
        }

        for (uint256 i = 0; i < products[msg.sender].length; i++) {
            if (
                bytes32(abi.encodePacked(products[msg.sender][i].id)) ==
                bytes32(abi.encodePacked(product_id))
            ) {
                _product.id = products[msg.sender][i].id;
                _product.metadata = products[msg.sender][i].metadata;
                _product.owner = to;
                _product.created_by = msg.sender;
                _product.status = "PENDING";
                _product.created_at = block.timestamp;
                products[msg.sender][i].status = "SENDING";
            }
        }
        products[to].push(_product);

        emit productTransaction(
            msg.sender,
            to,
            product_id,
            metadata,
            "SENDING",
            note,
            block.timestamp
        );
        emit productTransaction(
            msg.sender,
            to,
            product_id,
              metadata,
            "WAITING TO CONFIRMATION",
            note,
            block.timestamp
        );
        // emit userInteraction(
        //     msg.sender,
        //     "KIRIM BARANG",
        //     profile[msg.sender].name,
        //     block.timestamp
        // );
        return true;
    }

    function confirmationProduct(
        address prev_owner,
        string memory product_id,
        string memory note,
         string memory metadata
    ) external returns  (bool) {
        uint256 exists_product = 0;
        for (uint256 i = 0; i < products[msg.sender].length; i++) {
            if (
                bytes32(abi.encodePacked(products[msg.sender][i].id)) ==
                bytes32(abi.encodePacked(product_id))
            ) {
                products[msg.sender][i].status = "CONFIRMED";
                exists_product++;
            }
        }

        if (exists_product > 0) {
            for (uint256 i = 0; i < products[prev_owner].length; i++) {
                if (
                    bytes32(abi.encodePacked(products[prev_owner][i].id)) ==
                    bytes32(abi.encodePacked(product_id))
                ) {
                    products[prev_owner][i].status = "CONFIRMED";
                    exists_product++;
                }
            }
        }

        emit productTransaction(prev_owner, msg.sender, product_id,  metadata, "CONFIRMED", note, block.timestamp);
        return true;
    }

    function isOwner(address sender) external view returns (bool) {
        require(sender == owner, "unauthorized");
        return true;
    }

    function getAllPermission() external view returns(string[] memory) {
        return permission;
    }

    function addRole(string memory _role, string[] memory permissions) external returns(bool) {
        PermissionStruct memory _permissionStruct;
        _permissionStruct.name = _role;
        _permissionStruct.permission = permissions;
        permissionStruct.push(_permissionStruct);
        _permission[_role] = permissions;
        Role.push(_role);
        return true;
    }

    function mapArray(ProductStruct[] memory oldArray) public {
        ProductStruct[] storage _products = products[msg.sender];

        uint counter = 0;
        for (uint i = 0; i < oldArray.length ; i++)
        {
            if(bytes32(abi.encodePacked(oldArray[i].id)) != bytes32(abi.encodePacked(""))){
                _products[counter] = oldArray[i];
                counter++;
            }else {
                _products[oldArray.length - 1] = oldArray[i];
            }
        }
        _products.pop();
        products[msg.sender]  = _products;

    }

    function deleteProduct(string memory product_id, string memory note, string memory metadata) external returns(bool) {
        for (uint i = 0; i < products[msg.sender].length; i++)
        {
            if(bytes32(abi.encodePacked(products[msg.sender][i].id)) == bytes32(abi.encodePacked(product_id))){
                delete products[msg.sender][i];
            }
        }

        mapArray(products[msg.sender]);
        emit productTransaction(msg.sender, msg.sender, product_id,  metadata, "DELETED", note, block.timestamp);
        return true;
    }

    function updateProduct(string memory product_id, string memory metadata) external returns(bool) {

        for (uint i = 0; i < products[msg.sender].length; i++)
        {
            if(bytes32(abi.encodePacked(products[msg.sender][i].id)) == bytes32(abi.encodePacked(product_id))) {
                products[msg.sender][i].metadata = metadata;
            }
        }

        // emit userInteraction(msg.sender, "PRODUCT UPDATE", name[msg.sender], block.timestamp);
        return true;
    }

    function getPermission(address _sender) external  view returns (string[] memory) {
        require(_sender == owner);
        return permission;
    }

    function addPermission(address _sender,string memory _permissions) external returns (bool){
        require(_sender == owner);

        permission.push(_permissions);
        return true;
    }
}
